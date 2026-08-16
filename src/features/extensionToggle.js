import { ui, game, lib, _status } from "noname";

const UI_NAME = "\u5341\u5468\u5e74UI";
const CONFIG_KEY = `extension_${UI_NAME}_closedExtensions`;

function getOtherExtensions() {
	const protectedExtensions = _status.PROTECTED_EXTENSIONS ?? [];
	return (lib.config.extensions || []).filter(name => name !== UI_NAME && !protectedExtensions.includes(name));
}

function getClosedExtensions() {
	const value = lib.config[CONFIG_KEY];
	return Array.isArray(value) ? value : [];
}

function hasClosedExtensions() {
	return getClosedExtensions().length > 0;
}

function getToggleLabel() {
	return hasClosedExtensions() ? "\u6062\u590d\u5176\u4ed6\u6269\u5c55" : "\u5173\u95ed\u5176\u4ed6\u6269\u5c55";
}

function toggleExtensions() {
	const restoring = hasClosedExtensions();
	const names = restoring
		? getClosedExtensions()
		: getOtherExtensions().filter(name => lib.config[`extension_${name}_enable`]);
	if (names.length === 0) {
		alert(restoring ? "\u6ca1\u6709\u9700\u8981\u6062\u590d\u7684\u6269\u5c55" : "\u6ca1\u6709\u5176\u4ed6\u5df2\u542f\u7528\u7684\u6269\u5c55");
		return;
	}
	const action = restoring ? "\u6062\u590d\u5176\u4ed6" : "\u5173\u95ed\u5176\u4ed6";
	const list = names.map(name => `\u00b7 ${name}`).join("\n");
	if (!confirm(`\u786e\u5b9a${action}\u4ee5\u4e0b ${names.length} \u4e2a\u6269\u5c55\uff1f\n\n${list}\n\n\u5c06\u81ea\u52a8\u91cd\u542f\u6e38\u620f\u3002`)) return;
	if (restoring) {
		names.forEach(name => {
			if (lib.config.extensions?.includes(name)) game.saveConfig(`extension_${name}_enable`, true);
		});
		game.saveConfig(CONFIG_KEY, []);
	} else {
		game.saveConfig(CONFIG_KEY, names);
		names.forEach(name => game.saveConfig(`extension_${name}_enable`, false));
	}
	setTimeout(() => game.reload(), 100);
}

const TOGGLE_LABELS = new Set(["\u5173\u95ed\u5176\u4ed6\u6269\u5c55", "\u6062\u590d\u5176\u4ed6\u6269\u5c55"]);

function getToggleButtonCandidates() {
	const nodes = [
		...document.querySelectorAll(".decade-extension-toggle"),
		...document.querySelectorAll("#system div, #system1 div, #system2 div"),
	];
	return [...new Set(nodes)].filter(
		node => node.classList?.contains("decade-extension-toggle") || TOGGLE_LABELS.has(node.textContent?.trim()),
	);
}

function setupExtensionToggle() {
	if (window.decadeUI) window.decadeUI.toggleExtensions = toggleExtensions;
	if (window._decadeUIExtensionToggleSetup) return;
	window._decadeUIExtensionToggleSetup = true;

	const removeToggleButtons = () => getToggleButtonCandidates().forEach(node => node.remove());
	removeToggleButtons();

	const timer = setInterval(() => {
		if (!ui.system1 && !ui.system2) return;
		clearInterval(timer);

		removeToggleButtons();
		if (!window._decadeUIExtensionToggleObserver) {
			window._decadeUIExtensionToggleObserver = new MutationObserver(removeToggleButtons);
			[document.getElementById("system"), ui.system1, ui.system2].filter(Boolean).forEach(system =>
				window._decadeUIExtensionToggleObserver.observe(system, { childList: true, subtree: true }),
			);
		}
	}, 500);
}

export { setupExtensionToggle };
