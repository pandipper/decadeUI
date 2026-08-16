import { lib } from "noname";

const erudaPositionKey = "decadeUI.eruda.entryPosition";

function readErudaPosition() {
	try {
		const value = localStorage.getItem(erudaPositionKey);
		if (!value) return null;
		const position = JSON.parse(value);
		if (Number.isFinite(position?.x) && Number.isFinite(position?.y)) return position;
	} catch (e) {}
	return null;
}

function clampErudaPosition(position, node) {
	const size = node?.getBoundingClientRect?.().width || 54;
	const x = position?.normalized ? position.x * window.innerWidth : position?.x;
	const y = position?.normalized ? position.y * window.innerHeight : position?.y;
	if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
	return {
		x: Math.max(0, Math.min(x, window.innerWidth - size)),
		y: Math.max(0, Math.min(y, window.innerHeight - size)),
	};
}

function rememberErudaEntryPosition() {
	const eruda = window.eruda;
	const entry = eruda?.get?.("entryBtn");
	const node = entry?._$el?.get?.(0) || document.querySelector("._container ._entry-btn");
	if (!node) return;

	// Eruda 默认支持记忆位置，这里再用扩展自己的键保存一份，避免游戏环境的存储配置导致位置丢失。
	entry?.config?.set?.("rememberPos", true);
	const saved = clampErudaPosition(readErudaPosition(), node);
	if (saved) entry?.setPos?.(saved);

	if (window.__decadeUIErudaPositionNode === node) return;
	window.__decadeUIErudaPositionNode = node;
	window.__decadeUIErudaPositionObserver?.disconnect?.();

	const save = () => {
		const rect = node.getBoundingClientRect();
		const x = rect.left;
		const y = rect.top;
		if (!Number.isFinite(x) || !Number.isFinite(y)) return;
		try {
			localStorage.setItem(erudaPositionKey, JSON.stringify({
				x: window.innerWidth ? x / window.innerWidth : 0,
				y: window.innerHeight ? y / window.innerHeight : 0,
				normalized: true,
			}));
		} catch (e) {}
	};

	window.__decadeUIErudaPositionObserver = new MutationObserver(save);
	window.__decadeUIErudaPositionObserver.observe(node, {
		attributes: true,
		attributeFilter: ["style"],
	});
	document.addEventListener("pointerup", save, { passive: true });
	document.addEventListener("mouseup", save, { passive: true });
	document.addEventListener("touchend", save, { passive: true });
	save();
}

function initEruda() {
	if (!lib.config[`extension_${decadeUIName}_eruda`] || window.__decadeUIErudaLoading || document.querySelector("#eruda")) return;
	if (document.querySelector('script[data-decade-eruda="1"]')) return;

	window.__decadeUIErudaLoading = true;
	const script = document.createElement("script");
	script.dataset.decadeEruda = "1";
	script.src = `${decadeUIPath}src/libs/eruda.js`;
	script.onload = () => {
		window.__decadeUIErudaLoading = false;
		if (!window.eruda || document.querySelector("#eruda")) return;
		window.eruda.init();
		setTimeout(rememberErudaEntryPosition, 0);
	};
	script.onerror = () => {
		window.__decadeUIErudaLoading = false;
	};
	document.body.appendChild(script);
}

function initNodeFS() {
	if (window.require && !window.fs) window.fs = require("fs");
}

export { initEruda, initNodeFS };
