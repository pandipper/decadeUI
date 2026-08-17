import { lib, game, ui, get, _status } from "noname";

const STORAGE_KEY = "extension_十周年UI_visualLayouts";
const HAND_BUTTON_POSITION_KEY = "extension_十周年UI_handTogglePositions";
const HAND_BUTTON_ID = "dui-hand-toggle-button";
const EXCLUDED_MODES = new Set(["chess", "tafang", "boss", "taixuhuanjing", "hs_hearthstone"]);
const MANAGED_PROPERTIES = ["left", "right", "top", "bottom", "width", "height", "min-width", "min-height", "max-width", "max-height"];
const MIN_PLAYER_GAP = 6;

let installed = false;
let editorStyle;
let arenaObserver;
let resizeTimer;
const originals = new WeakMap();
const auxiliaryOriginals = new WeakMap();
const auxiliaryAppliedProfiles = new WeakMap();
const state = {
	active: false,
	toolbar: null,
	drag: null,
	listeners: [],
	undo: [],
	title: null,
	auxiliaryOverlays: new Map(),
	auxiliaryTimer: null,
	handButton: null,
	handButtonDrag: null,
	handcardsOpen: false,
	manualClosedDuringSelection: false,
	handcardsBeforeEditor: false,
	handMonitor: null,
};

function isNormalArenaMode() {
	return !EXCLUDED_MODES.has(get.mode());
}

function getPlayers() {
	if (!ui.arena) return [];
	return Array.from(ui.arena.children).filter(node => node.classList?.contains("player") && !node.classList.contains("minskin"));
}

function isNormalMultiplayer() {
	return isNormalArenaMode() && getPlayers().length > 1;
}

function isVisibleNode(node) {
	if (!(node instanceof HTMLElement) || !node.isConnected || node.classList.contains("hidden")) return false;
	const style = getComputedStyle(node);
	const rect = node.getBoundingClientRect();
	return style.display !== "none" && style.visibility !== "hidden" && rect.width > 2 && rect.height > 2;
}

function normalizeAuxiliaryDialog(node) {
	if (!(node instanceof HTMLElement)) return null;
	const dialog = node.closest?.(".skill-dialog,.dialog") || node;
	if (!isVisibleNode(dialog)) return null;
	if (
		dialog.matches(".main.menu,.menu.dialog,.decade-config-dialog,.dialog.static.popped.main") ||
		dialog.closest(".decade-config-overlay,#menu,.menu-container")
	) return null;
	return dialog;
}

function releaseExcludedDialogTranslations() {
	document.querySelectorAll(".main.menu.dialog,.menu.dialog,.decade-config-dialog,.decade-config-overlay .dialog").forEach(node => {
		if (node.dataset.duiAuxLayoutManaged === "true") restoreAuxiliaryOriginal(node);
	});
}

function getHandCountNodes() {
	if (!ui.arena) return [];
	return Array.from(new Set([
		ui.handcardNumber,
		...ui.arena.querySelectorAll(".handcardNumber,.handcardNumber1"),
	].filter(node => node instanceof HTMLElement && node.isConnected)));
}

function isChooseControlNode(node) {
	if (!(node instanceof HTMLElement) || !node.classList.contains("control")) return false;
	const text = node.textContent?.replace(/\s+/g, "") || "";
	return text === "更换" || text === "更换武将" || text === "自由选将";
}

function getChooseControlNodes() {
	const nodes = new Set([ui.cheat, ui.cheat2].filter(node => node instanceof HTMLElement && node.isConnected));
	ui.control?.querySelectorAll?.(":scope > .control")?.forEach(node => {
		if (isChooseControlNode(node)) nodes.add(node);
	});
	return Array.from(nodes).filter(isVisibleNode);
}

function getAuxiliaryTargets() {
	if (!ui.arena || !isNormalArenaMode()) return [];
	const targets = [];
	const add = (id, label, value) => {
		const nodes = (Array.isArray(value) ? value : [value]).filter(isVisibleNode);
		if (!nodes.length || targets.some(item => item.nodes.some(node => nodes.includes(node)))) return;
		targets.push({ id, label, node: nodes[0], nodes });
	};
	add("handcards", "手牌区", ui.me?.classList?.contains("hand-wrap") ? ui.me : ui.arena.querySelector(":scope > .hand-wrap"));
	add("handCount", "手牌计数区", getHandCountNodes());
	const chooseControls = getChooseControlNodes();
	for (const node of chooseControls) node.dataset.duiChooseControl = "true";
	add("chooseControls", "选将辅助按钮区", chooseControls);
	const confirm = ui.confirm?.isConnected ? ui.confirm : ui.arena.querySelector(".lbtn-confirm:not(.closing)");
	add(chooseControls.length ? "chooseConfirm" : "confirm", chooseControls.length ? "选将确认区" : "确认/回合结束区", confirm);
	const skillDialogs = Array.from(ui.window?.querySelectorAll?.(".skill-dialog:not(.closing)") || []).map(normalizeAuxiliaryDialog).filter(Boolean);
	const dialogs = Array.from(ui.window?.querySelectorAll?.(".dialog:not(.closing), .popup-container > .dialog:not(.closing)") || []).map(normalizeAuxiliaryDialog).filter(Boolean);
	const currentDialog = normalizeAuxiliaryDialog(ui.dialog);
	add("dialog", "对话/选将区", currentDialog || skillDialogs.at(-1) || dialogs.at(-1));
	return targets;
}

function cleanupNormalArenaArtifacts() {
	if (!ui.arena || !isNormalArenaMode()) return;
	releaseExcludedDialogTranslations();
	// 这些是触屏快捷入口，不属于普通多人牌局；太虚等特殊模式仍保留自己的节点。
	ui.arena.querySelectorAll(".huanfuButton_new,.huanfuButton_new1,.jiluButton_new,.jiluButton_new1,.meiguiButton_new,.meiguiButton_new1,.xiaolianButton_new,.xiaolianButton_new1").forEach(node => node.remove());
	// 太虚扩展在普通牌局中不得留下控制台/桌面快捷入口。
	document.querySelectorAll('[id^="taixuhuanjing_"],[class^="taixuhuanjing_"],[class*=" taixuhuanjing_"]').forEach(node => node.remove());
}

function removeLegacyHandcardPosition(profile) {
	if (!profile?.extras?.handcards) return false;
	delete profile.extras.handcards;
	return true;
}

function clearLegacyHandcardPositions() {
	const store = getStore();
	let changed = false;
	for (const profile of Object.values(store.profiles)) changed = removeLegacyHandcardPosition(profile) || changed;
	if (changed) saveStore(store);
}

function moveHandCountIntoMainPlayer() {
	if (!isNormalMultiplayer() || !game.me) return;
	for (const node of getHandCountNodes()) {
		const moved = node.parentNode !== game.me;
		if (moved) game.me.appendChild(node);
		if (moved || node.dataset.duiHandCountPositioned !== "true") {
			node.style.setProperty("position", "absolute", "important");
			node.style.setProperty("left", "-4px", "important");
			node.style.setProperty("right", "auto", "important");
			node.style.setProperty("top", "auto", "important");
			node.style.setProperty("bottom", "-3px", "important");
			node.style.setProperty("width", "130px", "important");
			node.style.setProperty("height", "32px", "important");
			node.style.setProperty("min-width", "130px", "important");
			node.style.setProperty("max-width", "130px", "important");
			node.style.setProperty("z-index", "210", "important");
			node.style.setProperty("transform", "none", "important");
			node.style.setProperty("pointer-events", "none", "important");
			const pictures = node.querySelectorAll(":scope > .cardPicture,:scope > .cardPicture1");
			for (const picture of pictures) {
				picture.style.setProperty("position", "absolute", "important");
				picture.style.setProperty("left", "0", "important");
				picture.style.setProperty("right", "auto", "important");
				picture.style.setProperty("top", "auto", "important");
				picture.style.setProperty("bottom", "0", "important");
				picture.style.setProperty("width", "130px", "important");
				picture.style.setProperty("height", "30px", "important");
				picture.style.setProperty("transform", "none", "important");
			}
			const numbers = node.querySelectorAll(":scope > .cardNumber,:scope > .cardNumber1");
			for (const number of numbers) {
				number.style.setProperty("position", "absolute", "important");
				number.style.setProperty("left", "42px", "important");
				number.style.setProperty("right", "auto", "important");
				number.style.setProperty("top", "auto", "important");
				number.style.setProperty("bottom", "3px", "important");
				number.style.setProperty("width", "82px", "important");
				number.style.setProperty("height", "24px", "important");
				number.style.setProperty("line-height", "24px", "important");
				number.style.setProperty("transform", "none", "important");
			}
			node.dataset.duiHandCountPositioned = "true";
		}
	}
}

function refreshNormalArenaLayout() {
	if (!ui.arena) return;
	const enabled = isNormalMultiplayer();
	ui.arena.classList.toggle("dui-normal-multiplayer-layout", enabled);
	if (enabled) {
		cleanupNormalArenaArtifacts();
		moveHandCountIntoMainPlayer();
		ensureHandToggleButton();
	} else {
		state.handButton?.remove();
		state.handButton = null;
		ui.arena.classList.remove("dui-handcards-open", "dui-handcards-closed");
	}
}

function getSeat(player, index) {
	return String(player.dataset.position ?? index);
}

function getDeviceProfile() {
	const phone = Boolean(get.is.phoneLayout?.() || ui.arena?.classList.contains("phone") || ui.arena?.classList.contains("dui-mobile"));
	const orientation = window.innerWidth >= window.innerHeight ? "landscape" : "portrait";
	return `${phone ? "phone" : "desktop"}-${orientation}`;
}

function getHandButtonPositions() {
	const value = lib.config[HAND_BUTTON_POSITION_KEY];
	return value && typeof value === "object" ? value : {};
}

function saveHandButtonPosition() {
	const button = state.handButton;
	if (!button?.isConnected || !window.innerWidth || !window.innerHeight) return;
	const rect = button.getBoundingClientRect();
	const positions = getHandButtonPositions();
	positions[getDeviceProfile()] = {
		x: Number((rect.left / window.innerWidth).toFixed(6)),
		y: Number((rect.top / window.innerHeight).toFixed(6)),
	};
	lib.config[HAND_BUTTON_POSITION_KEY] = positions;
	game.saveConfig(HAND_BUTTON_POSITION_KEY, positions);
}

function applyHandButtonPosition() {
	const button = state.handButton;
	if (!button?.isConnected) return;
	const saved = getHandButtonPositions()[getDeviceProfile()];
	const size = button.getBoundingClientRect().width || 58;
	const left = saved ? saved.x * window.innerWidth : Math.max(12, window.innerWidth - size - 90);
	const top = saved ? saved.y * window.innerHeight : Math.max(90, window.innerHeight - size - 190);
	button.style.left = `${Math.max(0, Math.min(left, window.innerWidth - size))}px`;
	button.style.top = `${Math.max(0, Math.min(top, window.innerHeight - size))}px`;
}

function isCardSelectionActive() {
	if (!isNormalMultiplayer()) return false;
	const event = _status.event;
	if (!event || _status.auto) return false;
	if (ui.arena?.classList.contains("selecting") && ui.arena.querySelector("#me .card.selectable, .hand-wrap .card.selectable")) return true;
	if (!event.isMine?.()) return false;
	return Boolean(event.filterCard || event.selectCard || ["chooseToUse", "chooseToRespond", "chooseToDiscard", "chooseCard", "chooseCardTarget"].includes(event.name));
}

function updateHandButtonState() {
	const button = state.handButton;
	if (!button) return;
	button.classList.toggle("open", state.handcardsOpen);
	button.title = state.handcardsOpen ? "收起手牌" : "展开手牌";
}

function setHandcardsOpen(open, manual = false) {
	if (!isNormalMultiplayer()) return;
	state.handcardsOpen = Boolean(open);
	if (manual) state.manualClosedDuringSelection = !open && isCardSelectionActive();
	ui.arena?.classList.toggle("dui-handcards-open", state.handcardsOpen);
	ui.arena?.classList.toggle("dui-handcards-closed", !state.handcardsOpen);
	updateHandButtonState();
	if (state.handcardsOpen) requestAnimationFrame(() => {
		window.decadeUI?.layout?.updateHand?.();
		if (!state.active) applyAuxiliaryProfile(getStore().profiles[getProfileKey()]);
	});
}

function monitorHandSelection() {
	cleanupNormalArenaArtifacts();
	dedupeHandToggleButtons();
	if (state.handButton) {
		const menuOpen = ui.menuContainer && !ui.menuContainer.classList.contains("hidden");
		state.handButton.classList.toggle("dui-hand-toggle-hidden", Boolean(menuOpen));
	}
	const selecting = isCardSelectionActive();
	if (!selecting) state.manualClosedDuringSelection = false;
	else if (!state.manualClosedDuringSelection && !state.handcardsOpen) setHandcardsOpen(true);
}

function dedupeHandToggleButtons() {
	const buttons = Array.from(document.querySelectorAll(`#${HAND_BUTTON_ID},.dui-hand-toggle-button`));
	let keep = state.handButton?.isConnected ? state.handButton : buttons[0];
	for (const button of buttons) {
		if (button !== keep) button.remove();
	}
	if (keep?.isConnected) {
		keep.id = HAND_BUTTON_ID;
		state.handButton = keep;
		window.__decadeUIHandToggleButton = keep;
	}
	return keep;
}

function beginHandButtonPointer(event) {
	if (event.button > 0) return;
	const button = state.handButton;
	const rect = button.getBoundingClientRect();
	state.handButtonDrag = {
		startX: event.clientX,
		startY: event.clientY,
		left: rect.left,
		top: rect.top,
		moved: false,
	};
	button.setPointerCapture?.(event.pointerId);
	event.preventDefault();
	event.stopPropagation();
}

function moveHandButtonPointer(event) {
	const drag = state.handButtonDrag;
	if (!drag) return;
	const dx = event.clientX - drag.startX;
	const dy = event.clientY - drag.startY;
	if (!drag.moved && Math.hypot(dx, dy) < 6) return;
	drag.moved = true;
	const button = state.handButton;
	const size = button.getBoundingClientRect().width || 58;
	button.style.left = `${Math.max(0, Math.min(drag.left + dx, window.innerWidth - size))}px`;
	button.style.top = `${Math.max(0, Math.min(drag.top + dy, window.innerHeight - size))}px`;
	event.preventDefault();
	event.stopPropagation();
}

function endHandButtonPointer(event) {
	const drag = state.handButtonDrag;
	if (!drag) return;
	state.handButtonDrag = null;
	if (drag.moved) saveHandButtonPosition();
	else setHandcardsOpen(!state.handcardsOpen, true);
	event.preventDefault();
	event.stopPropagation();
}

function cancelHandButtonPointer(event) {
	const drag = state.handButtonDrag;
	if (!drag) return;
	state.handButtonDrag = null;
	if (drag.moved) saveHandButtonPosition();
	event.preventDefault();
	event.stopPropagation();
}

function ensureHandToggleButton() {
	if (!isNormalMultiplayer()) {
		state.handButton?.remove();
		state.handButton = null;
		return;
	}
	const shared = window.__decadeUIHandToggleButton;
	if (shared?.isConnected) state.handButton = shared;
	if (dedupeHandToggleButtons()?.isConnected) return;
	const button = document.createElement("button");
	button.type = "button";
	button.id = HAND_BUTTON_ID;
	button.className = "dui-hand-toggle-button";
	button.setAttribute("aria-label", "显示或收起手牌");
	button.addEventListener("pointerdown", beginHandButtonPointer, true);
	button.addEventListener("pointermove", moveHandButtonPointer, true);
	button.addEventListener("pointerup", endHandButtonPointer, true);
	button.addEventListener("pointercancel", cancelHandButtonPointer, true);
	ui.window.appendChild(button);
	state.handButton = button;
	window.__decadeUIHandToggleButton = button;
	applyHandButtonPosition();
	setHandcardsOpen(false);
}

function getProfileKey() {
	const players = getPlayers();
	const style = lib.config.extension_十周年UI_newDecadeStyle || "default";
	const layout = ui.arena?.dataset.layout || game.layout || "default";
	return [get.mode(), players.length, style, layout, getDeviceProfile()].join("|");
}

function getStore() {
	const value = lib.config[STORAGE_KEY];
	if (value && typeof value === "object" && value.profiles) return value;
	return { version: 2, profiles: {} };
}

function saveStore(store) {
	lib.config[STORAGE_KEY] = store;
	game.saveConfig(STORAGE_KEY, store);
}

function captureOriginal(player) {
	if (originals.has(player)) return;
	const values = {};
	for (const property of MANAGED_PROPERTIES) {
		values[property] = {
			value: player.style.getPropertyValue(property),
			priority: player.style.getPropertyPriority(property),
		};
	}
	originals.set(player, values);
}

function restoreOriginal(player) {
	const values = originals.get(player);
	for (const property of MANAGED_PROPERTIES) {
		const original = values?.[property];
		if (original?.value) player.style.setProperty(property, original.value, original.priority);
		else player.style.removeProperty(property);
	}
	delete player.dataset.duiLayoutManaged;
}

function captureAuxiliaryOriginal(node) {
	if (auxiliaryOriginals.has(node)) return;
	auxiliaryOriginals.set(node, {
		value: node.style.getPropertyValue("translate"),
		priority: node.style.getPropertyPriority("translate"),
	});
}

function restoreAuxiliaryOriginal(node) {
	const original = auxiliaryOriginals.get(node);
	if (original?.value) node.style.setProperty("translate", original.value, original.priority);
	else node.style.removeProperty("translate");
	delete node._duiLayoutTranslation;
	delete node.dataset.duiAuxLayoutManaged;
	auxiliaryAppliedProfiles.delete(node);
}

function setAuxiliaryTranslation(node, x, y) {
	captureAuxiliaryOriginal(node);
	const nextX = Number.isFinite(x) ? x : 0;
	const nextY = Number.isFinite(y) ? y : 0;
	node.style.setProperty("translate", `${nextX}px ${nextY}px`, "important");
	node._duiLayoutTranslation = { x: nextX, y: nextY };
	node.dataset.duiAuxLayoutManaged = "true";
}

function getAuxiliaryRect(target) {
	const rects = target.nodes.filter(isVisibleNode).map(node => node.getBoundingClientRect());
	if (!rects.length) return null;
	const left = Math.min(...rects.map(rect => rect.left));
	const top = Math.min(...rects.map(rect => rect.top));
	const right = Math.max(...rects.map(rect => rect.right));
	const bottom = Math.max(...rects.map(rect => rect.bottom));
	return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function restoreAuxiliaryTarget(target) {
	for (const node of target.nodes) restoreAuxiliaryOriginal(node);
}

function setAuxiliaryTargetTranslation(target, x, y) {
	for (const node of target.nodes) setAuxiliaryTranslation(node, x, y);
}

function applyAuxiliaryPosition(target, saved, token, force = false) {
	if (!target?.nodes?.length || !saved || !window.innerWidth || !window.innerHeight) return;
	if (!force && target.nodes.every(node => auxiliaryAppliedProfiles.get(node) === token)) return;
	for (const node of target.nodes) {
		captureAuxiliaryOriginal(node);
		node.style.removeProperty("translate");
	}
	const base = getAuxiliaryRect(target);
	if (!base) return;
	const desiredLeft = saved.x * window.innerWidth;
	const desiredTop = saved.y * window.innerHeight;
	const maxLeft = Math.max(0, window.innerWidth - base.width);
	const maxTop = Math.max(0, window.innerHeight - base.height);
	setAuxiliaryTargetTranslation(
		target,
		Math.max(0, Math.min(desiredLeft, maxLeft)) - base.left,
		Math.max(0, Math.min(desiredTop, maxTop)) - base.top,
	);
	for (const node of target.nodes) auxiliaryAppliedProfiles.set(node, token);
}

function setPlayerBox(player, left, top, width, height) {
	captureOriginal(player);
	player.style.setProperty("left", `${left}px`, "important");
	player.style.setProperty("right", "auto", "important");
	player.style.setProperty("top", `${top}px`, "important");
	player.style.setProperty("bottom", "auto", "important");
	player.style.setProperty("width", `${width}px`, "important");
	player.style.setProperty("height", `${height}px`, "important");
	player.style.setProperty("min-width", `${width}px`, "important");
	player.style.setProperty("min-height", `${height}px`, "important");
	player.style.setProperty("max-width", `${width}px`, "important");
	player.style.setProperty("max-height", `${height}px`, "important");
	player.dataset.duiLayoutManaged = "true";
}

function clampBox(left, top, width, height, arenaRect) {
	const minLeft = -arenaRect.left;
	const minTop = -arenaRect.top;
	const maxLeft = window.innerWidth - arenaRect.left - width;
	const maxTop = window.innerHeight - arenaRect.top - height;
	return {
		left: Math.max(minLeft, Math.min(left, Math.max(minLeft, maxLeft))),
		top: Math.max(minTop, Math.min(top, Math.max(minTop, maxTop))),
	};
}

function readCurrentProfile() {
	const arenaRect = ui.arena?.getBoundingClientRect();
	const players = getPlayers();
	if (!arenaRect?.width || !arenaRect.height || !players.length) return null;
	const seats = {};
	const previous = getStore().profiles[getProfileKey()];
	const extras = { ...(previous?.extras || {}) };
	players.forEach((player, index) => {
		const rect = player.getBoundingClientRect();
		seats[getSeat(player, index)] = {
			x: Number(((rect.left - arenaRect.left) / arenaRect.width).toFixed(6)),
			y: Number(((rect.top - arenaRect.top) / arenaRect.height).toFixed(6)),
			w: Number((rect.width / arenaRect.width).toFixed(6)),
		};
	});
	for (const target of getAuxiliaryTargets()) {
		const rect = getAuxiliaryRect(target);
		if (!rect) continue;
		const { id } = target;
		extras[id] = {
			x: Number((rect.left / window.innerWidth).toFixed(6)),
			y: Number((rect.top / window.innerHeight).toFixed(6)),
		};
	}
	return {
		updatedAt: Date.now(),
		aspectRatio: 16 / 9,
		seats,
		extras,
	};
}

function saveCurrentProfile() {
	if (!isNormalArenaMode()) return false;
	if (state.active && !validateLayout()) return false;
	const profile = readCurrentProfile();
	if (!profile) return false;
	const store = getStore();
	store.version = 2;
	store.profiles[getProfileKey()] = profile;
	saveStore(store);
	return true;
}

function applyAuxiliaryProfile(profile, force = false) {
	if (!profile || !isNormalArenaMode()) return;
	for (const target of getAuxiliaryTargets()) {
		const { id } = target;
		const token = `${getProfileKey()}|${profile.updatedAt || 0}|${id}`;
		if (profile.extras?.[id]) applyAuxiliaryPosition(target, profile.extras[id], token, force);
	}
}

function applyProfile(profile, forceAuxiliary = false) {
	if (!profile || !ui.arena || !isNormalArenaMode()) return false;
	const arenaRect = ui.arena.getBoundingClientRect();
	if (!arenaRect.width || !arenaRect.height) return false;
	const players = getPlayers();
	players.forEach((player, index) => {
		const saved = profile.seats?.[getSeat(player, index)];
		if (!saved) return;
		const width = Math.max(120, saved.w * arenaRect.width);
		const height = width * 9 / 16;
		const position = clampBox(saved.x * arenaRect.width, saved.y * arenaRect.height, width, height, arenaRect);
		setPlayerBox(player, position.left, position.top, width, height);
	});
	applyAuxiliaryProfile(profile, forceAuxiliary);
	return true;
}

function applySavedProfile(forceAuxiliary = false) {
	if (state.active || !isNormalArenaMode()) return false;
	const profile = getStore().profiles[getProfileKey()];
	return applyProfile(profile, forceAuxiliary);
}

function pushUndo() {
	const snapshot = readCurrentProfile();
	if (!snapshot) return;
	state.undo.push(snapshot);
	if (state.undo.length > 20) state.undo.shift();
}

function undo() {
	const profile = state.undo.pop();
	if (!profile) return;
	applyProfile(profile);
	validateLayout();
	saveCurrentProfile();
}

function resetCurrentProfile() {
	const store = getStore();
	delete store.profiles[getProfileKey()];
	saveStore(store);
	for (const player of getPlayers()) restoreOriginal(player);
	for (const target of getAuxiliaryTargets()) restoreAuxiliaryTarget(target);
	refreshNormalArenaLayout();
}

function addEditorDecorations() {
	getPlayers().forEach((player, index) => {
		if (!player.querySelector(":scope > .dui-layout-seat-label")) {
			const label = document.createElement("div");
			label.className = "dui-layout-seat-label";
			label.textContent = `座位 ${getSeat(player, index)}`;
			player.appendChild(label);
		}
		if (!player.querySelector(":scope > .dui-layout-resize-handle")) {
			const handle = document.createElement("div");
			handle.className = "dui-layout-resize-handle";
			handle.title = "拖动以统一调整全部玩家框尺寸";
			player.appendChild(handle);
		}
	});
	syncAuxiliaryOverlays();
}

function removeEditorDecorations() {
	ui.arena?.querySelectorAll(".dui-layout-seat-label,.dui-layout-resize-handle").forEach(node => node.remove());
	for (const overlay of state.auxiliaryOverlays.values()) overlay.remove();
	state.auxiliaryOverlays.clear();
	clearInterval(state.auxiliaryTimer);
	state.auxiliaryTimer = null;
}

function updateAuxiliaryOverlay(overlay, target) {
	const rect = getAuxiliaryRect(target);
	if (!rect) return;
	overlay.style.left = `${rect.left}px`;
	overlay.style.top = `${rect.top}px`;
	overlay.style.width = `${rect.width}px`;
	overlay.style.height = `${rect.height}px`;
}

function beginAuxiliaryPointer(event) {
	if (!state.active || event.button > 0) return;
	const overlay = event.currentTarget;
	const target = overlay._duiAuxiliaryTarget;
	if (!target?.nodes?.some(node => node.isConnected)) return;
	pushUndo();
	const translation = target.nodes.find(node => node._duiLayoutTranslation)?._duiLayoutTranslation || { x: 0, y: 0 };
	state.drag = {
		kind: "auxiliary",
		id: target.id,
		target,
		overlay,
		startX: event.clientX,
		startY: event.clientY,
		translateX: translation.x,
		translateY: translation.y,
	};
	event.preventDefault();
	event.stopPropagation();
}

function syncAuxiliaryOverlays() {
	if (!state.active) return;
	const targets = getAuxiliaryTargets();
	const activeIds = new Set(targets.map(target => target.id));
	for (const [id, overlay] of state.auxiliaryOverlays) {
		const nextTarget = targets.find(target => target.id === id);
		const currentNodes = overlay._duiAuxiliaryTarget?.nodes || [];
		if (!activeIds.has(id) || currentNodes.length !== nextTarget?.nodes.length || currentNodes.some((node, index) => node !== nextTarget.nodes[index])) {
			overlay.remove();
			state.auxiliaryOverlays.delete(id);
		}
	}
	for (const target of targets) {
		let overlay = state.auxiliaryOverlays.get(target.id);
		if (!overlay) {
			overlay = document.createElement("div");
			overlay.className = "dui-layout-auxiliary-overlay";
			overlay.innerHTML = `<span>${target.label}</span>`;
			overlay.addEventListener("pointerdown", beginAuxiliaryPointer, true);
			document.body.appendChild(overlay);
			state.auxiliaryOverlays.set(target.id, overlay);
		}
		overlay._duiAuxiliaryTarget = target;
		updateAuxiliaryOverlay(overlay, target);
	}
}

function resizeAllPlayers(width) {
	const arenaRect = ui.arena.getBoundingClientRect();
	const minWidth = Math.max(180, arenaRect.width * 0.16);
	const maxWidth = Math.min(arenaRect.width * 0.48, arenaRect.height * 0.48 * 16 / 9);
	const nextWidth = Math.max(minWidth, Math.min(width, maxWidth));
	const nextHeight = nextWidth * 9 / 16;
	for (const player of getPlayers()) {
		const rect = player.getBoundingClientRect();
		const currentLeft = rect.left - arenaRect.left;
		const currentTop = rect.top - arenaRect.top;
		const position = clampBox(currentLeft, currentTop, nextWidth, nextHeight, arenaRect);
		setPlayerBox(player, position.left, position.top, nextWidth, nextHeight);
	}
	validateLayout();
}

function normalizeSixPlayerSize() {
	const players = getPlayers();
	if (players.length !== 6) return;
	const widths = players.map(player => player.getBoundingClientRect().width).sort((a, b) => a - b);
	resizeAllPlayers(widths[Math.floor(widths.length / 2)]);
}

function validateLayout() {
	const players = getPlayers();
	players.forEach(player => player.classList.remove("dui-layout-collision"));
	let valid = true;
	for (let i = 0; i < players.length; i++) {
		const a = players[i].getBoundingClientRect();
		for (let j = i + 1; j < players.length; j++) {
			const b = players[j].getBoundingClientRect();
			const separated =
				a.right + MIN_PLAYER_GAP <= b.left ||
				b.right + MIN_PLAYER_GAP <= a.left ||
				a.bottom + MIN_PLAYER_GAP <= b.top ||
				b.bottom + MIN_PLAYER_GAP <= a.top;
			if (!separated) {
				valid = false;
				players[i].classList.add("dui-layout-collision");
				players[j].classList.add("dui-layout-collision");
			}
		}
	}
	if (state.title) {
		state.title.textContent = valid
			? "布局编辑：蓝框拖动角色，橙框拖动手牌/手牌计数/确认/选将辅助/对话区；右下角统一缩放角色（16:9）"
			: "存在重叠或间距不足：请先分开红色角色框";
		state.title.classList.toggle("warning", !valid);
	}
	return valid;
}

function beginPointer(event) {
	if (!state.active || event.button > 0) return;
	const player = event.currentTarget;
	if (!player?.classList.contains("player")) return;
	pushUndo();
	const arenaRect = ui.arena.getBoundingClientRect();
	const rect = player.getBoundingClientRect();
	state.drag = {
		kind: event.target.closest?.(".dui-layout-resize-handle") ? "resize" : "move",
		player,
		startX: event.clientX,
		startY: event.clientY,
		left: rect.left - arenaRect.left,
		top: rect.top - arenaRect.top,
		width: rect.width,
		height: rect.height,
	};
	event.preventDefault();
	event.stopPropagation();
}

function movePointer(event) {
	const drag = state.drag;
	if (!drag || !state.active) return;
	const dx = event.clientX - drag.startX;
	const dy = event.clientY - drag.startY;
	if (drag.kind === "auxiliary") {
		setAuxiliaryTargetTranslation(drag.target, drag.translateX + dx, drag.translateY + dy);
		updateAuxiliaryOverlay(drag.overlay, drag.target);
	} else if (drag.kind === "resize") {
		resizeAllPlayers(drag.width + Math.max(dx, dy * 16 / 9));
	} else {
		const arenaRect = ui.arena.getBoundingClientRect();
		const position = clampBox(drag.left + dx, drag.top + dy, drag.width, drag.height, arenaRect);
		setPlayerBox(drag.player, position.left, position.top, drag.width, drag.height);
		validateLayout();
	}
	event.preventDefault();
	event.stopPropagation();
}

function endPointer(event) {
	if (!state.drag) return;
	state.drag = null;
	if (validateLayout()) saveCurrentProfile();
	syncAuxiliaryOverlays();
	event?.preventDefault?.();
	event?.stopPropagation?.();
}

function bindPlayers() {
	for (const player of getPlayers()) {
		const handler = beginPointer.bind(player);
		player.addEventListener("pointerdown", handler, true);
		state.listeners.push([player, "pointerdown", handler, true]);
	}
	window.addEventListener("pointermove", movePointer, true);
	window.addEventListener("pointerup", endPointer, true);
	window.addEventListener("pointercancel", endPointer, true);
	state.listeners.push([window, "pointermove", movePointer, true]);
	state.listeners.push([window, "pointerup", endPointer, true]);
	state.listeners.push([window, "pointercancel", endPointer, true]);
}

function unbindPlayers() {
	for (const [target, type, handler, options] of state.listeners) target.removeEventListener(type, handler, options);
	state.listeners.length = 0;
}

function makeButton(text, action, className = "") {
	const button = document.createElement("button");
	button.type = "button";
	button.className = `dui-layout-editor-button ${className}`.trim();
	button.textContent = text;
	button.addEventListener("click", event => {
		event.preventDefault();
		event.stopPropagation();
		action();
	});
	return button;
}

function createToolbar() {
	const toolbar = document.createElement("div");
	toolbar.className = "dui-layout-editor-toolbar";
	const title = document.createElement("span");
	title.className = "dui-layout-editor-title";
	title.textContent = "布局编辑：蓝框拖动角色，橙框拖动手牌/手牌计数/确认/选将辅助/对话区；右下角统一缩放角色（16:9）";
	toolbar.append(
		title,
		makeButton("撤销", undo),
		makeButton("恢复默认", () => {
			pushUndo();
			resetCurrentProfile();
			addEditorDecorations();
			validateLayout();
		}),
		makeButton("完成并保存", () => exitEditor(true), "primary"),
	);
	ui.window.appendChild(toolbar);
	state.toolbar = toolbar;
	state.title = title;
	validateLayout();
}

function enterEditor() {
	if (state.active) return true;
	if (!isNormalArenaMode()) {
		alert("当前特殊模式不启用布局编辑。请进入普通身份、国战、斗地主等牌局后使用。");
		return false;
	}
	if (!ui.arena || !getPlayers().length) {
		alert("请先进入一局游戏，再打开布局编辑。");
		return false;
	}
	if (ui.menuContainer && !ui.menuContainer.classList.contains("hidden")) ui.click.configMenu?.();
	state.active = true;
	state.undo.length = 0;
	refreshNormalArenaLayout();
	state.handcardsBeforeEditor = state.handcardsOpen;
	setHandcardsOpen(true);
	const savedProfile = getStore().profiles[getProfileKey()];
	if (savedProfile) applyProfile(savedProfile);
	pushUndo();
	ui.arena.classList.add("dui-layout-editing");
	normalizeSixPlayerSize();
	addEditorDecorations();
	state.auxiliaryTimer = setInterval(syncAuxiliaryOverlays, 250);
	bindPlayers();
	createToolbar();
	return true;
}

function exitEditor(save = true) {
	if (!state.active) return;
	if (save && !validateLayout()) {
		alert("仍有角色框重叠或间距不足，请先分开红色角色框再完成编辑。");
		return false;
	}
	if (save) saveCurrentProfile();
	state.drag = null;
	state.active = false;
	unbindPlayers();
	removeEditorDecorations();
	state.toolbar?.remove();
	state.toolbar = null;
	state.title = null;
	ui.arena?.classList.remove("dui-layout-editing");
	setHandcardsOpen(state.handcardsBeforeEditor);
}

function toggleEditor() {
	if (state.active) exitEditor(true);
	else enterEditor();
}

function installStyle() {
	if (editorStyle) return;
	editorStyle = document.createElement("style");
	editorStyle.id = "dui-layout-editor-style";
	editorStyle.textContent = `
		#arena.dui-layout-editing > .player {
			cursor: move !important;
			outline: 3px dashed rgba(64, 190, 255, .95) !important;
			outline-offset: -3px;
			touch-action: none !important;
			user-select: none !important;
			z-index: 160 !important;
		}
		#arena.dui-layout-editing > .player > *:not(.dui-layout-seat-label):not(.dui-layout-resize-handle) {
			pointer-events: none !important;
		}
		.dui-layout-seat-label {
			position: absolute !important;
			left: 6px !important;
			top: 6px !important;
			z-index: 1000 !important;
			padding: 4px 8px !important;
			border-radius: 4px !important;
			background: rgba(0, 70, 110, .88) !important;
			color: white !important;
			font: 14px/1.2 sans-serif !important;
			pointer-events: none !important;
		}
		.dui-layout-resize-handle {
			position: absolute !important;
			right: -3px !important;
			bottom: -3px !important;
			width: 30px !important;
			height: 30px !important;
			z-index: 1001 !important;
			cursor: nwse-resize !important;
			pointer-events: auto !important;
			background: linear-gradient(135deg, transparent 0 45%, #fff 46% 56%, #2eaee8 57% 68%, transparent 69%) !important;
		}
		#arena.dui-layout-editing > .player.dui-layout-collision {
			outline-color: #ff3b30 !important;
			box-shadow: 0 0 0 3px rgba(255, 59, 48, .45), 0 0 20px rgba(255, 59, 48, .8) !important;
		}
		.dui-layout-editor-toolbar {
			position: fixed !important;
			left: 50% !important;
			top: max(8px, env(safe-area-inset-top, 0px)) !important;
			transform: translateX(-50%) !important;
			z-index: 100000 !important;
			display: flex !important;
			align-items: center !important;
			gap: 8px !important;
			padding: 8px 10px !important;
			border: 1px solid rgba(255, 210, 120, .85) !important;
			border-radius: 8px !important;
			background: rgba(20, 20, 20, .92) !important;
			box-shadow: 0 4px 18px rgba(0, 0, 0, .55) !important;
			pointer-events: auto !important;
		}
		.dui-layout-editor-title { color: #ffe7ad !important; font: 14px/1.2 sans-serif !important; white-space: nowrap !important; }
		.dui-layout-editor-title.warning { color: #ff766d !important; }
		.dui-layout-editor-button {
			appearance: none !important;
			border: 1px solid #9f8253 !important;
			border-radius: 5px !important;
			padding: 5px 10px !important;
			background: #3a3127 !important;
			color: #fff2cb !important;
			font: 14px/1.2 sans-serif !important;
			cursor: pointer !important;
		}
		.dui-layout-editor-button.primary { background: #816127 !important; border-color: #e1bd6d !important; }
		#arena.dui-normal-multiplayer-layout > .hand-wrap,
		#arena.dui-normal-multiplayer-layout > .hand-back {
			z-index: 260 !important;
			transition: opacity .16s ease, visibility .16s ease !important;
			pointer-events: none !important;
		}
		#arena.dui-normal-multiplayer-layout.dui-handcards-closed > .hand-wrap,
		#arena.dui-normal-multiplayer-layout.dui-handcards-closed > .hand-back {
			opacity: 0 !important;
			visibility: hidden !important;
			pointer-events: none !important;
		}
		#arena.dui-normal-multiplayer-layout.dui-handcards-open > .hand-wrap,
		#arena.dui-normal-multiplayer-layout.dui-handcards-open > .hand-back {
			opacity: 1 !important;
			visibility: visible !important;
			pointer-events: none !important;
		}
		#arena.dui-normal-multiplayer-layout.dui-handcards-open > .hand-wrap .hand-cards,
		#arena.dui-normal-multiplayer-layout.dui-handcards-open > .hand-wrap .handcards {
			pointer-events: none !important;
			background: transparent !important;
		}
		#arena.dui-normal-multiplayer-layout.dui-handcards-open > .hand-wrap .handcards > .card {
			pointer-events: auto !important;
		}
		#arena.dui-normal-multiplayer-layout .lbtn-confirm,
		#arena.dui-normal-multiplayer-layout > .dialog,
		#window > .dialog,
		#window > .popup-container {
			z-index: 320 !important;
		}
		.dui-hand-toggle-button {
			position: fixed !important;
			width: 58px !important;
			height: 58px !important;
			min-width: 58px !important;
			min-height: 58px !important;
			padding: 0 !important;
			margin: 0 !important;
			border: 2px solid rgba(197, 151, 70, .88) !important;
			border-radius: 50% !important;
			background-color: rgba(22, 20, 18, .9) !important;
			background-image: url("${lib.assetURL}extension/主公武将包限制/zf_boming.png") !important;
			background-repeat: no-repeat !important;
			background-position: center !important;
			background-size: 82% 82% !important;
			box-shadow: 0 2px 9px rgba(0, 0, 0, .75) !important;
			z-index: 300 !important;
			cursor: move !important;
			touch-action: none !important;
			user-select: none !important;
			outline: none !important;
		}
		.dui-hand-toggle-button.open {
			border-color: #ffd36a !important;
			box-shadow: 0 0 5px #ffbc2e, 0 0 15px rgba(255, 169, 35, .9) !important;
			filter: brightness(1.12) !important;
		}
		.dui-hand-toggle-button.dui-hand-toggle-hidden {
			display: none !important;
		}
		#arena.dui-normal-multiplayer-layout > .player > .handcardNumber,
		#arena.dui-normal-multiplayer-layout > .player > .handcardNumber1 {
			position: absolute !important;
			left: -4px !important;
			right: auto !important;
			top: auto !important;
			bottom: -3px !important;
			width: 130px !important;
			height: 32px !important;
			min-width: 130px !important;
			max-width: 130px !important;
			z-index: 210 !important;
			transform: none !important;
			pointer-events: none !important;
		}
		#arena.dui-normal-multiplayer-layout > .player > .handcardNumber > .cardPicture,
		#arena.dui-normal-multiplayer-layout > .player > .handcardNumber > .cardPicture1,
		#arena.dui-normal-multiplayer-layout > .player > .handcardNumber1 > .cardPicture,
		#arena.dui-normal-multiplayer-layout > .player > .handcardNumber1 > .cardPicture1 {
			left: 0 !important;
			right: auto !important;
			top: auto !important;
			bottom: 0 !important;
			width: 130px !important;
			height: 30px !important;
			min-width: 130px !important;
			max-width: 130px !important;
			z-index: 0 !important;
			transform: none !important;
		}
		#arena.dui-normal-multiplayer-layout > .player > .handcardNumber > .cardNumber,
		#arena.dui-normal-multiplayer-layout > .player > .handcardNumber > .cardNumber1,
		#arena.dui-normal-multiplayer-layout > .player > .handcardNumber1 > .cardNumber,
		#arena.dui-normal-multiplayer-layout > .player > .handcardNumber1 > .cardNumber1 {
			left: 42px !important;
			right: auto !important;
			top: auto !important;
			bottom: 3px !important;
			width: 82px !important;
			height: 24px !important;
			line-height: 24px !important;
			z-index: 1 !important;
			transform: none !important;
		}
		#arena.dui-normal-multiplayer-layout > #roundmenu.roundarenabutton {
			display: none !important;
		}
		#arena.dui-normal-multiplayer-layout[data-new-decade-style="horizontal"] > .player > .chain {
			top: 84% !important;
		}
		.dui-layout-auxiliary-overlay {
			position: fixed !important;
			z-index: 99998 !important;
			box-sizing: border-box !important;
			border: 3px dashed #f5a623 !important;
			background: rgba(245, 166, 35, .10) !important;
			cursor: move !important;
			touch-action: none !important;
			user-select: none !important;
			pointer-events: auto !important;
		}
		.dui-layout-auxiliary-overlay > span {
			position: absolute !important;
			left: 5px !important;
			top: 5px !important;
			padding: 4px 8px !important;
			border-radius: 4px !important;
			background: rgba(105, 62, 0, .92) !important;
			color: #fff3ce !important;
			font: 14px/1.2 sans-serif !important;
			pointer-events: none !important;
		}
	`;
	document.head.appendChild(editorStyle);
}

function watchArena() {
	if (!ui.window || arenaObserver) return;
	const containsChooseControl = node => {
		if (node.matches("[data-dui-choose-control]") || node.querySelector?.("[data-dui-choose-control]")) return true;
		if (isChooseControlNode(node)) return true;
		if (Array.from(node.querySelectorAll?.(".control") || []).some(isChooseControlNode)) return true;
		return [ui.cheat, ui.cheat2].some(control => control instanceof Node && (node === control || node.contains(control)));
	};
	const isRelevantNode = node =>
		node instanceof HTMLElement &&
		(node.matches(".player,.hand-wrap,.hand-back,.handcardNumber,.handcardNumber1,.lbtn-confirm,.dialog,.skill-dialog,.popup-container") ||
			node.querySelector?.(".player,.hand-wrap,.hand-back,.handcardNumber,.handcardNumber1,.lbtn-confirm,.dialog,.skill-dialog") ||
			containsChooseControl(node));
	arenaObserver = new MutationObserver(mutations => {
		if (!mutations.some(mutation => [...mutation.addedNodes, ...mutation.removedNodes].some(isRelevantNode))) return;
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			refreshNormalArenaLayout();
			if (state.active) {
				if (state.drag?.kind !== "auxiliary") applyAuxiliaryProfile(getStore().profiles[getProfileKey()]);
				unbindPlayers();
				addEditorDecorations();
				bindPlayers();
			} else {
				applySavedProfile();
			}
		}, 50);
	});
	arenaObserver.observe(ui.window, { childList: true, subtree: true });
}

function setupLayoutEditor() {
	if (installed || window.__decadeUILayoutEditorInstalled) return;
	installed = true;
	window.__decadeUILayoutEditorInstalled = true;
	installStyle();
	const initialize = () => {
		watchArena();
		requestAnimationFrame(() => requestAnimationFrame(() => {
			refreshNormalArenaLayout();
			applySavedProfile();
			window.decadeUI?.layout?.resize?.();
		}));
	};
	lib.arenaReady.push(initialize);
	state.handMonitor = setInterval(monitorHandSelection, 120);
	window.addEventListener("resize", () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			refreshNormalArenaLayout();
			applySavedProfile(true);
			applyHandButtonPosition();
		}, 120);
	});
	window.decadeUILayoutEditor = {
		enter: enterEditor,
		exit: () => exitEditor(true),
		toggle: toggleEditor,
		save: saveCurrentProfile,
		reset: resetCurrentProfile,
		undo,
		isActive: () => state.active,
		apply: applySavedProfile,
	};
}

export { setupLayoutEditor };
