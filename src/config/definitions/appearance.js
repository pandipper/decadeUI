/**
 * @fileoverview 整体外观配置定义
 * @description 纯配置数据，不包含业务逻辑
 * @module config/definitions/appearance
 */
import { createCollapseTitle, createCollapseEnd } from "../utils.js";
import { onExtensionToggleClick, onExtensionToggleUpdate, onNewDecadeStyleClick, onNewDecadeStyleUpdate, onOutcropSkinClick, onOutcropSkinUpdate, onBorderLevelUpdate, onAloneEquipUpdate, onMeanPrettifyClick, onDynamicSkinClick, onDynamicSkinOutcropUpdate } from "../handlers/appearance-handlers.js";
import { game, ui } from "noname";

/**
 * 扩展开关配置
 * @type {Object}
 */
export const extensionToggle = {
	clear: true,
	onclick: onExtensionToggleClick,
	update: onExtensionToggleUpdate,
};

/**
 * 新版配置菜单配置
 * @type {Object}
 */
export const newConfigWindow = {
	name: "打开新版菜单",
	intro: "在独立窗口中打开现代化的配置界面",
	clear: true,
	onclick() {
		if (window.decadeUI?.showConfigWindow) {
			window.decadeUI.showConfigWindow();
		}
	},
};

/**
 * 调试助手配置
 * @type {Object}
 */
export const eruda = {
	name: "调试助手",
	init: false,
};

/**
 * 整体外观折叠标题
 * @type {Object}
 */
export const outward_title = createCollapseTitle("outward_title", "整体外观");

/**
 * 切换样式配置
 * @type {Object}
 */
export const newDecadeStyle = {
	name: "切换样式",
	intro: "切换武将边框样式和界面布局，选择不同设置后游戏会自动重启，电脑端支持alt+1234567快捷切换",
	init: "on",
	item: {
		on: "十周年",
		off: "移动版",
		othersOff: "一将成名",
		onlineUI: "online",
		babysha: "欢乐三国杀",
		codename: "名将杀",
		horizontal: "横向布局",
	},
	onclick: onNewDecadeStyleClick,
	update: onNewDecadeStyleUpdate,
};

/**
 * 露头样式配置
 * @type {Object}
 */
export const outcropSkin = {
	name: "露头样式",
	init: "off",
	item: { shizhounian: "十周年露头", shousha: "手杀露头", off: "关闭" },
	update: onOutcropSkinUpdate,
	onclick: onOutcropSkinClick,
};

/**
 * 边框风格配置
 * @type {Object}
 */
export const borderStyle = {
	name: "边框风格•仅一将",
	intro: "切换阵营边框的图片风格",
	init: "xinsha",
	item: {
		xinsha: "赤炎",
		dragon2: "玄墨",
		dragon3: "耀金",
		dragon4: "龙旗",
	},
	onclick(item) {
		game.saveConfig("extension_十周年UI_borderStyle", item);
		if (window.decadeUI) {
			ui.arena.dataset.borderStyle = item;
			onBorderLevelUpdate();
		}
	},
};

/**
 * 等阶边框配置
 * @type {Object}
 */
export const borderLevel = {
	name: "等阶边框",
	init: "five",
	item: { one: "一阶", two: "二阶", three: "三阶", four: "四阶", five: "五阶", random: "随机" },
	update: onBorderLevelUpdate,
};

/**
 * 单独装备栏配置
 * @type {Object}
 */
export const aloneEquip = {
	name: "单独装备栏",
	intro: "切换玩家装备栏为单独装备栏或非单独装备栏",
	init: true,
	update: onAloneEquipUpdate,
};

/**
 * 菜单美化配置
 * @type {Object}
 */
export const meanPrettify = {
	name: "菜单美化",
	intro: "开启全屏的菜单样式",
	init: false,
	onclick: onMeanPrettifyClick,
};

/**
 * 动态皮肤配置
 * @type {Object}
 */
export const dynamicSkin = {
	name: "动态皮肤",
	intro: "开启后显示动态皮肤，阵亡后也保留",
	init: false,
	onclick: onDynamicSkinClick,
};

/**
 * 动皮露头配置
 * @type {Object}
 */
export const dynamicSkinOutcrop = {
	name: "动皮露头",
	init: false,
	update: onDynamicSkinOutcropUpdate,
};

/**
 * 击杀特效配置
 * @type {Object}
 */
export const killEffect = {
	name: "击杀特效",
	intro: "开启后，击杀敌方角色时会显示击杀特效",
	init: true,
};

/**
 * 玩家阵亡特效配置
 * @type {Object}
 */
export const playerDieEffect = {
	name: "玩家阵亡特效",
	intro: "开启后，阵亡时显示身份图片",
	init: true,
};

/**
 * 整体外观折叠结束标记
 * @type {Object}
 */
export const outward_title_end = createCollapseEnd("outward_title");

/**
 * 布局编辑器开关（进入 / 退出普通牌局布局编辑）
 * @type {Object}
 */
export const visualLayoutEditor = {
	clear: true,
	name: '<ins>进入/退出普通牌局布局编辑</ins>',
	intro: '拖动完整角色单元；拖动右下角统一缩放。每次松手都会自动记忆，特殊模式不处理。',
	onclick: function () {
		const editor = window.decadeUILayoutEditor;
		if (!editor) {
			alert('十周年UI布局编辑器尚未加载，请确认十周年UI已经启用。');
			return;
		}
		editor.toggle();
	},
};

/**
 * 布局编辑器重置（恢复当前牌局默认布局）
 * @type {Object}
 */
export const resetVisualLayout = {
	clear: true,
	name: '<ins>恢复当前牌局默认布局</ins>',
	intro: '只清除当前模式、人数、十周年UI样式及桌面/触屏方向对应的布局记忆。',
	onclick: function () {
		const editor = window.decadeUILayoutEditor;
		if (!editor || !ui.arena || !game.players?.length) {
			alert('请先进入一局普通模式游戏，再恢复当前布局。');
			return;
		}
		editor.reset();
		alert('当前布局已恢复为默认值。');
	},
};

/**
 * 整体外观配置集合
 * @type {Object}
 */
export const appearanceConfigs = {
	extensionToggle,
	newConfigWindow,
	eruda,
	outward_title,
	newDecadeStyle,
	outcropSkin,
	borderStyle,
	borderLevel,
	aloneEquip,
	meanPrettify,
	dynamicSkin,
	dynamicSkinOutcrop,
	killEffect,
	playerDieEffect,
	visualLayoutEditor,
	resetVisualLayout,
	outward_title_end,
};
