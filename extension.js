import { lib, game, ui, _status } from "../../noname.js";
export const type = "extension";
export default function(){
	return {name:"下载皮肤",arenaReady:function(){
		if (typeof ui !== "undefined" && ui.create && typeof ui.create.control === "function") {
			const systemBtn = ui.create.system("下载皮肤", async () => {
				try {
					const downloadAll = lib.config.extension_下载皮肤_download_all_resources === true;
					const downloadOL = lib.config.extension_下载皮肤_source === 'ol';
					const source = downloadOL ? 'ol' : '十周年';
					const WORKER_URL = "https://yuop.dpdns.org";
					
					console.log(`当前源: ${source}`);
					
					if (downloadAll) {
						if (!window.confirm("确定要下载所有皮肤吗？这可能需要很长时间。")) return;
						
						console.log(`开始获取 ${source} 皮肤列表`);
						const configRes = await fetch(`${WORKER_URL}/config/skin/${encodeURIComponent(source)}`);
						console.log(`配置响应: ${configRes.status}`);
						
						if (!configRes.ok) {
							if (ui && ui.toast) ui.toast("获取皮肤列表失败");
							return;
						}
						
						const json = await configRes.json();
						const skinIds = json.skinIds || [];
						
						if (skinIds.length === 0) {
							if (ui && ui.toast) ui.toast("未找到皮肤");
							return;
						}
						
						console.log(`找到 ${skinIds.length} 个皮肤`);
						
						let successCount = 0;
						for (let i = 0; i < skinIds.length; i++) {
							const skinId = skinIds[i];
							try {
								console.log(`[${i+1}/${skinIds.length}] 下载皮肤 ${skinId}`);
								const url = `${WORKER_URL}/download/skin/${encodeURIComponent(source)}/${encodeURIComponent(skinId)}`;
								console.log(`请求 URL: ${url}`);
								const res = await fetch(url);
								console.log(`皮肤 ${skinId} 响应: ${res.status}`);
								
								if (res.ok) {
									const data = await res.json();
									const files = data.files || [];
									console.log(`皮肤 ${skinId} 有 ${files.length} 个文件`);
									
									await downloadFiles(files);
									successCount++;
									
									if (ui && ui.toast && i % 10 === 0) {
										ui.toast(`已完成 ${successCount}/${skinIds.length} 个皮肤`);
									}
								}
							} catch (err) {
								console.error(`下载皮肤 ${skinId} 失败:`, err);
							}
						}
						
						if (ui && ui.toast) ui.toast(`所有皮肤下载完成 (${successCount}/${skinIds.length})`);
					} else {
						let raw;
						if (game && game.promises && typeof game.promises.prompt === "function") {
							raw = await game.promises.prompt("###请输入皮肤编号（可逗号/空格分隔多个）###");
							if (raw === false) return;
						} else {
							raw = window.prompt("请输入皮肤编号（支持逗号分隔多个）");
						}
						if (!raw) return;
						
						const skinIds = raw.split(/[，,\s]+/).map(s => s.trim()).filter(Boolean);
						if (skinIds.length === 0) return;
						
						console.log(`开始下载 ${skinIds.length} 个皮肤，源: ${source}`);
						
						let successCount = 0;
						for (let i = 0; i < skinIds.length; i++) {
							const skinId = skinIds[i];
							try {
								console.log(`[${i+1}/${skinIds.length}] 下载皮肤 ${skinId}`);
								const url = `${WORKER_URL}/download/skin/${encodeURIComponent(source)}/${encodeURIComponent(skinId)}`;
								console.log(`请求 URL: ${url}`);
								const res = await fetch(url);
								console.log(`皮肤 ${skinId} 响应: ${res.status}`);
								
								if (res.ok) {
									const data = await res.json();
									const files = data.files || [];
									console.log(`皮肤 ${skinId} 有 ${files.length} 个文件`);
									
									await downloadFiles(files);
									successCount++;
									console.log(`皮肤 ${skinId} 下载完成`);
								}
							} catch (err) {
								console.error(`下载皮肤 ${skinId} 失败:`, err);
							}
						}
						
						if (ui && ui.toast) ui.toast(`皮肤下载完成 (${successCount}/${skinIds.length})`);
					}
				} catch (e) {
					console.error("下载出错:", e);
					if (ui && ui.toast) ui.toast(e.message || "下载出错");
				}
			}, true);
			void systemBtn;
		}
	},content:function(){},prepare:function(){},config:{download_all_resources:{name:'下载所有资源',intro:'开启后点击下载皮肤会下载JSON里所有皮肤。关闭后需要输入编号下载。',init:false,onclick:function(item){game.saveConfig('extension_下载皮肤_download_all_resources',item);}},source:{name:'皮肤源',intro:'选择要下载的皮肤源',init:'十周年',item:{十周年:'十周年',ol:'ol'},onclick:function(control){game.saveConfig('extension_下载皮肤_source',control);if(ui&&ui.toast)ui.toast(`已切换到: ${control}`);}}},help:{},package:{character:{character:{},translate:{}},card:{card:{},translate:{},list:[]},skill:{skill:{},translate:{}},intro:"",author:"咸鱼",diskURL:"",forumURL:"",version:"2.0"},files:{"character":[],"card":[],"skill":[],"audio":[]},connect:false}
};

async function downloadFiles(files) {
	const ensure = (path) => (game.promises && game.promises.ensureDirectory) ? game.promises.ensureDirectory(path) : Promise.resolve();
	await ensure("extension/下载皮肤/skins");

	let successCount = 0;
	let failCount = 0;

	for (const file of files) {
		try {
			let fileData;
			
			if (file.type === 'text') {
				// 台词文件：直接使用文本
				fileData = file.text;
			} else {
				const fileRes = await fetch(file.url);
				if (!fileRes.ok) {
					console.warn(`下载 ${file.name} 失败: ${fileRes.status}`);
					failCount++;
					continue;
				}
				const blob = await fileRes.blob();
				fileData = await blob.arrayBuffer();
			}

			// targetDir 已经包含了 skins/十周年/ 这样的路径
			const fullPath = `extension/下载皮肤/${file.targetDir}/${file.name}`;
			const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
			const baseName = fullPath.substring(fullPath.lastIndexOf('/') + 1);
			
			console.log(`保存文件: ${fullPath}`);
			await ensure(dirPath);

			if (game.promises && game.promises.writeFile) {
				await game.promises.writeFile(fileData, dirPath, baseName);
			} else if (game.writeFile) {
				await new Promise(resolve => game.writeFile(fileData, dirPath, baseName, resolve));
			}
			
			successCount++;
		} catch (err) {
			console.error(`处理文件失败:`, err);
			failCount++;
		}
	}

	console.log(`文件下载完成: 成功 ${successCount}, 失败 ${failCount}`);
}
