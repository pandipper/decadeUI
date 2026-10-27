/**
 * @fileoverview horizontal 布局专属配置项定义
 * @description 这些配置项只在 horizontal 布局下有意义，因此**不并入** `config` 主表：
 * 主表会作为扩展 config 交给本体渲染全局设置面板，并进去等于所有布局都能看到这些开关。
 *
 * 本文件导出后仅由配置窗口（src/config/config-window.js）读取，配合配置项的
 * `layouts` 字段按当前布局过滤渲染。
 * @module config/definitions/horizontal
 */

/**
 * 双击角色看技能
 * @type {Object}
 */
export const doubleClickSkill = {
	name: "双击角色看技能而非介绍",
	init: true,
	intro: "开启后，双击武将打开的名片会默认切到「技能」页，而不是「简介」页；找不到技能按钮时会保持本体默认行为",
};

/**
 * 技能描述高亮
 * @type {Object}
 */
export const skillDescHighlight = {
	name: "技能描述高亮",
	init: true,
	intro: "开启后，技能描述里的时机与频率关键词（如「出牌阶段」「每回合限一次」「受到伤害后」）会以橙色标出",
};

/**
 * horizontal 专属配置集合
 * @description 仅供配置窗口按布局过滤后渲染，不参与扩展全局设置面板
 * @type {Object}
 */
export const horizontalConfigs = {
	doubleClickSkill,
	skillDescHighlight,
};
