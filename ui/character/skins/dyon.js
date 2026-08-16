/**
 * dyon 没有独立的武将详情逻辑，沿用新版十周年实现。
 */
import { createShizhounianCharacterPlugin } from "./shizhounian.js";

export function createDyonCharacterPlugin(lib, game, ui, get, ai, _status, app) {
	const plugin = createShizhounianCharacterPlugin(lib, game, ui, get, ai, _status, app);
	return {
		...plugin,
		skinName: "dyon",
	};
}
