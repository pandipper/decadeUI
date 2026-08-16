import { lib, ui, get } from "noname";

const PORTRAIT_RATIO_LIMIT = 1.35;
const EXCLUDED_MODES = new Set(["chess", "tafang", "boss", "taixuhuanjing", "hs_hearthstone"]);
const ratioCache = new Map();
let installed = false;
let portraitStyle;
let observer;
let scanTimer;

function extractFirstUrl(backgroundImage) {
	if (!backgroundImage || backgroundImage === "none") return "";
	const match = backgroundImage.match(/url\((?:"|')?(.*?)(?:"|')?\)/i);
	return match ? match[1] : "";
}

function getAvatarSource(avatar) {
	const inline = extractFirstUrl(avatar.style.backgroundImage || avatar.style.background);
	if (inline) return inline;
	return extractFirstUrl(getComputedStyle(avatar).backgroundImage);
}

function getImageRatio(src) {
	if (ratioCache.has(src)) return ratioCache.get(src);
	const promise = new Promise(resolve => {
		const image = new Image();
		image.onload = () => resolve(image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 16 / 9);
		image.onerror = () => {
			// 初始化阶段资源可能尚未就绪；失败结果不缓存，交给后续全量复查重试。
			ratioCache.delete(src);
			resolve(null);
		};
		image.src = src;
	});
	ratioCache.set(src, promise);
	return promise;
}

function removePortraitLayers(avatar) {
	avatar.classList.remove("dui-portrait-letterbox");
	avatar.querySelectorAll(":scope > .dui-portrait-backdrop,:scope > .dui-portrait-main").forEach(node => node.remove());
	delete avatar.dataset.duiPortraitSource;
}

function ensureLayer(avatar, className) {
	let layer = avatar.querySelector(`:scope > .${className}`);
	if (!layer) {
		layer = document.createElement("div");
		layer.className = className;
		avatar.insertBefore(layer, avatar.firstChild);
	}
	return layer;
}

async function updateAvatar(avatar) {
	if (!(avatar instanceof HTMLElement)) return;
	const player = avatar.closest(".player");
	if (!player) {
		removePortraitLayers(avatar);
		return;
	}
	const dynamicForThisAvatar =
		(avatar.classList.contains("primary-avatar") && player.classList.contains("d-skin") && player.querySelector(":scope > .dynamic-wrap")) ||
		(avatar.classList.contains("deputy-avatar") && player.classList.contains("d-skin2") && player.querySelector(":scope > .dynamic-wrap"));
	// 动态皮肤无论静态头像当前是否可见，都不参与静态原画双层处理。
	if (dynamicForThisAvatar) {
		removePortraitLayers(avatar);
		return;
	}
	const src = getAvatarSource(avatar);
	if (!src) {
		removePortraitLayers(avatar);
		return;
	}
	if (avatar.dataset.duiPortraitSource === src && avatar.classList.contains("dui-portrait-letterbox")) return;
	avatar.dataset.duiPortraitSource = src;
	const ratio = await getImageRatio(src);
	if (avatar.dataset.duiPortraitSource !== src) return;
	if (!Number.isFinite(ratio)) {
		delete avatar.dataset.duiPortraitSource;
		return;
	}
	if (ratio >= PORTRAIT_RATIO_LIMIT) {
		removePortraitLayers(avatar);
		return;
	}
	const backdrop = ensureLayer(avatar, "dui-portrait-backdrop");
	const main = ensureLayer(avatar, "dui-portrait-main");
	backdrop.style.backgroundImage = `url("${src.replace(/"/g, "\\\"")}")`;
	main.style.backgroundImage = backdrop.style.backgroundImage;
	avatar.classList.add("dui-portrait-letterbox");
}

function scanAvatars(root = ui.arena) {
	if (!root || EXCLUDED_MODES.has(get.mode())) return;
	if (root.matches?.(".primary-avatar,.deputy-avatar")) updateAvatar(root);
	root.querySelectorAll?.(".player > .primary-avatar,.player > .deputy-avatar").forEach(updateAvatar);
}

function scheduleScan() {
	clearTimeout(scanTimer);
	// 始终复查全部角色，避免多个头像连续变化时后一次局部检查覆盖前一次。
	scanTimer = setTimeout(() => scanAvatars(ui.arena), 30);
}

function watchArena() {
	if (!ui.arena || observer || EXCLUDED_MODES.has(get.mode())) return;
	observer = new MutationObserver(mutations => {
		for (const mutation of mutations) {
			if (mutation.type === "attributes" && mutation.target.matches?.(".primary-avatar,.deputy-avatar")) {
				scheduleScan();
				return;
			}
			if (mutation.type === "attributes" && mutation.target.matches?.(".player")) {
				scheduleScan();
				return;
			}
			if (mutation.type === "childList" && mutation.addedNodes.length) {
				for (const node of mutation.addedNodes) {
					if (!(node instanceof HTMLElement)) continue;
					if (node.matches(".player,.primary-avatar,.deputy-avatar") || node.querySelector(".primary-avatar,.deputy-avatar")) {
						scheduleScan();
						return;
					}
				}
			}
		}
	});
	observer.observe(ui.arena, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: ["style", "class"],
	});
}

function installStyle() {
	if (portraitStyle) return;
	portraitStyle = document.createElement("style");
	portraitStyle.id = "dui-portrait-letterbox-style";
	portraitStyle.textContent = `
		#arena > .player > .primary-avatar.dui-portrait-letterbox,
		#arena > .player > .deputy-avatar.dui-portrait-letterbox {
			overflow: hidden !important;
			isolation: isolate;
			background-color: #171717 !important;
			background-size: 0 0 !important;
		}
		.dui-portrait-letterbox > .dui-portrait-backdrop,
		.dui-portrait-letterbox > .dui-portrait-main {
			position: absolute !important;
			pointer-events: none !important;
			background-repeat: no-repeat !important;
			background-position: center center !important;
		}
		.dui-portrait-letterbox > .dui-portrait-backdrop {
			inset: -18px !important;
			z-index: 1 !important;
			background-size: cover !important;
			filter: blur(8.4px) brightness(.62) saturate(1.08) !important;
			transform: scale(1.05) !important;
		}
		.dui-portrait-letterbox > .dui-portrait-main {
			inset: 0 !important;
			z-index: 2 !important;
			background-size: contain !important;
			filter: drop-shadow(0 0 5px rgba(0, 0, 0, .65)) !important;
		}
		.dui-portrait-letterbox > .action,
		.dui-portrait-letterbox > .outcrop-mask {
			position: relative;
			z-index: 5 !important;
		}
	`;
	document.head.appendChild(portraitStyle);
}

function setupPortraitLetterbox() {
	if (installed) return;
	installed = true;
	installStyle();
	lib.arenaReady.push(() => {
		watchArena();
		requestAnimationFrame(() => scanAvatars());
		// 开局时玩家节点通常已经存在，但头像背景可能稍后才写入。
		// 用有限次数复查覆盖初始化阶段，避免必须等到选中/换将后才触发属性观察。
		[120, 350, 800, 1600, 3000, 5000, 8000].forEach(delay => {
			setTimeout(() => scanAvatars(), delay);
		});
	});
}

export { setupPortraitLetterbox };
