import { defineConfig, type PluginOption } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig(({ mode }) => ({
	define: {
		"process.env.NODE_ENV": JSON.stringify(mode),
	},
	plugins: [
		viteStaticCopy({
			targets: [
				// 生产构建剥离 eruda 调试器：仅拷贝 spine.js（WebGL 骨骼引擎，运行时必需），
				// 不再随产物分发 eruda.js（790KB 调试工具，默认关闭且仅开发期有用）。
				// 开发模式(mode=development)保持原样拷贝整个 src/libs（含 eruda）以便调试。
				...(mode === "production"
					? [{ src: "src/libs/spine.js", dest: "src/libs" }]
					: [{ src: "src/libs", dest: "src" }]),
				{ src: "src/styles", dest: "src" },
				{ src: "src/config/*.css", dest: "src/config" },
				{ src: "src/features/*.css", dest: "src/features" },
				{ src: "src/features/*.txt", dest: "src/features" },
				{ src: "src/skins/dynamicSkin.js", dest: "src/skins" },
				{ src: "assets", dest: "" },
				{ src: "audio", dest: "" },
				{ src: "image", dest: "" },
				{ src: "ui/assets", dest: "ui" },
				{ src: "ui/styles", dest: "ui" },
				{ src: "ui/character/skins/*.js", dest: "ui/character/skins" },
				{ src: "ui/skill/skins/*.js", dest: "ui/skill/skins" },
				{ src: "ui/lbtn/skins/*.js", dest: "ui/lbtn/skins" },
				{ src: "docs", dest: "" },
				{ src: "info.json", dest: "" },
				{ src: "LICENSE", dest: "" },
				{ src: "README.md", dest: "" },
			],
		}) as PluginOption,
	],
	build: {
		sourcemap: false,
		minify: "terser",
		terserOptions: {
			format: {
				comments: false,
			},
			mangle: {
				reserved: ["game", "player", "card", "event", "trigger", "result", "lib", "get", "ui", "ai", "_status"],
			},
		},
		lib: {
			entry: {
				extension: "extension.js",
				"src/ui/skillButtonTooltip": "src/ui/skillButtonTooltip.js",
				"ui/constants": "ui/constants.js",
				"ui/utils": "ui/utils.js",
				"ui/lbtn/plugin": "ui/lbtn/plugin.js",
				"ui/lbtn/chatSystem": "ui/lbtn/chatSystem.js",
				"ui/skill/plugin": "ui/skill/plugin.js",
				"ui/character/plugin": "ui/character/plugin.js",
			},
			formats: ["es"],
		},
		outDir: `dist`,
		emptyOutDir: true,
		rollupOptions: {
			preserveEntrySignatures: "strict",
			external: ["noname", /src\/skins\/dynamicSkin\.js$/],
			output: {
				preserveModules: true,
				preserveModulesRoot: "./",
				entryFileNames: "[name].js",
				chunkFileNames: "[name].js",
				assetFileNames: "[name][extname]",
			},
		},
	},
}));
