/**
 * dyon 风格技能栏。
 *
 * 旧版 main_dyon.js 与 main2.js 完全一致，所以直接继承新版十周年技能逻辑。
 */
import { createShizhounianSkillPlugin } from "./shizhounian.js";

export function createDyonSkillPlugin(lib, game, ui, get, ai, _status, app) {
	const plugin = createShizhounianSkillPlugin(lib, game, ui, get, ai, _status, app);
	return {
		...plugin,
		skinName: "dyon",
	};
}
