/**
 * @fileoverview 配置模块入口
 * @description 组装所有配置定义，提供统一的配置导出
 * @module config
 */
import { appearanceConfigs } from "./definitions/appearance.js";
import { cardConfigs } from "./definitions/card.js";
import { componentConfigs } from "./definitions/component.js";
import { miscConfigs } from "./definitions/misc.js";
import { cardSkinPresets, cardSkinMeta, registerDynamicSkin, getAllCardSkinPresets } from "./utils.js";

/**
 * 扩展配置项
 * @description 按功能分组组装的完整配置对象
 *
 * 注意：本对象会作为扩展 config 交给本体渲染全局设置面板，因此**不得**放入
 * 仅对某个布局有意义的配置项（如 horizontalConfigs），否则所有布局都会看到。
 * @type {Object}
 */
export const config = {
	...appearanceConfigs,
	...cardConfigs,
	...componentConfigs,
	...miscConfigs,
};

export { cardSkinPresets, cardSkinMeta, registerDynamicSkin, getAllCardSkinPresets };
export { appearanceConfigs, cardConfigs, componentConfigs, miscConfigs };
// 布局专属配置：不进 config 主表，仅由配置窗口按当前布局过滤后渲染
export { horizontalConfigs } from "./definitions/horizontal.js";
