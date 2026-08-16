/**
 * dyon 风格控制栏。
 *
 * 旧版 dyon 与十周年控制栏只有布局差异，因此复用新版十周年行为，
 * 将个人调整保留在 ui/styles/lbtn/dyon.css 中。
 */
import { createShizhounianLbtnPlugin } from "./shizhounian.js";

export function createDyonLbtnPlugin(lib, game, ui, get, ai, _status, app) {
	const plugin = createShizhounianLbtnPlugin(lib, game, ui, get, ai, _status, app);
	return {
		...plugin,
		skinName: "dyon",
	};
}
