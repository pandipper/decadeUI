/**
 * 皮肤继承工厂。
 *
 * 适用于“仅 CSS 差异、行为完全复用某个默认皮肤”的场景（典型如 dyon 复用十周年）。
 * 传入默认皮肤的创建函数与皮肤名，返回一个同名创建函数，仅把返回插件的
 * skinName 改成目标皮肤名，其余行为完全继承。
 *
 * @param {Function} defaultCreator - 默认皮肤的 createXxxPlugin(...) 函数
 * @param {string} skinName - 目标皮肤名（需与 STYLE_TO_SKIN 映射中的 key 一致）
 * @returns {Function} 签名与 defaultCreator 一致的创建函数
 */
export function inheritSkin(defaultCreator, skinName) {
	return function (...args) {
		const plugin = defaultCreator(...args);
		return { ...plugin, skinName };
	};
}
