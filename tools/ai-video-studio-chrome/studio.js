"use strict";

/* DHL AI Video Studio: Chrome MV3 extension. No remote code or embedded keys. */
const $ = (id) => document.getElementById(id);
const MAIN_FOLDER = "DHL AI Video Studio";
const SCENE_FIELDS = [
  ["start", "Bắt đầu (mm:ss)", false], ["end", "Kết thúc (mm:ss)", false],
  ["description", "Nội dung hình ảnh / góc máy", true],
  ["dialogue", "Lời thoại / voiceover", true],
  ["image_prompt", "Prompt tạo ảnh ChatGPT", true],
  ["video_prompt", "Prompt Google Flow", true],
  ["notes", "Ghi chú / âm thanh / chuyển cảnh", true]
];
const defaults = () => ({
  version: 1, id: crypto.randomUUID(), name: "Dự án video mới",
  brief: "", aspect: "9:16", language: "vi",
  source: { name: "", size: 0, mime: "", url: "", duration: null },
  scenes: [], driveFolderId: "", driveFileId: "", driveVideoId: "",
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
});
let project = defaults();
let videoFile = null;
let objectUrl = null;
let driveToken = "";
let rootFolderId = "";
let timer = null;
let busy = false;

function show(text, error = false, target = "message") {
  const node = $(target);
  node.textContent = text;
  node.classList.toggle("error", error);
  node.classList.toggle("ok", !error && target === "driveStatus");
}
function progress(percentage, text) {
  $("progress").hidden = false;
  $("progressFill").style.width = Math.min(100, Math.max(0, percentage)) + "%";
  if (text) show(text);
}
function setBusy(value) {
  busy = value;
  ["analyzeBtn", "driveUploadVideo", "driveSave", "loadProject", "connectDrive"].forEach((id) => {
    $(id).disabled = value;
  });
}
function syncProject() {
  project.name = $("projectName").value.trim() || "Dự án video mới";
  project.brief = $("brief").value;
  project.aspect = $("aspect").value;
  project.language = $("language").value;
  project.source.url = $("sourceUrl").value.trim();
  project.updatedAt = new Date().toISOString();
}
async function saveLocal() {
  syncProject();
  await chrome.storage.local.set({ videoStudioDraft: project });
  $("saveStatus").textContent = "Đã lưu nháp " + new Date().toLocaleTimeString("vi-VN");
}
function scheduleSave() {
  $("saveStatus").textContent = "Chưa lưu thay đổi";
  clearTimeout(timer);
  timer = setTimeout(() => { saveLocal().catch((e) => show(e.message, true)); }, 650);
}
function hydrate() {
  $("projectName").value = project.name || "";
  $("brief").value = project.brief || "";
  $("aspect").value = project.aspect || "9:16";
  $("language").value = project.language || "vi";
  $("sourceUrl").value = project.source?.url || "";
  $("videoInfo").textContent = project.source?.name
    ? "Video tham chiếu: " + project.source.name + " (chọn lại tệp để phân tích/tải lên)"
    : "Chưa chọn video. Công cụ không tự tải nội dung từ đường dẫn Drive.";
  renderScenes();
}
function addScene(data = {}) {
  const scene = {
    id: crypto.randomUUID(), start: "", end: "", description: "",
    dialogue: "", image_prompt: "", video_prompt: "", notes: "", ...data
  };
  project.scenes.push(scene);
  renderScenes();
  scheduleSave();
}
function renderScenes() {
  const wrap = $("scenes");
  wrap.replaceChildren();
  const scenes = Array.isArray(project.scenes) ? project.scenes : [];
  $("emptyState").hidden = scenes.length > 0;
  $("sceneCount").textContent = scenes.length + " cảnh · Tự lưu nháp khi chỉnh sửa";
  scenes.forEach((scene, index) => {
    const article = document.createElement("article");
    article.className = "scene";
    const head = document.createElement("div");
    head.className = "scene-head";
    const title = document.createElement("strong");
    title.textContent = "CẢNH " + String(index + 1).padStart(2, "0");
    const remove = document.createElement("button");
    remove.className = "secondary";
    remove.textContent = "Xóa cảnh";
    remove.addEventListener("click", () => {
      if (!confirm("Xóa cảnh này khỏi dự án?")) return;
      project.scenes.splice(index, 1);
      renderScenes();
      scheduleSave();
    });
    head.append(title, remove);
    article.append(head);
    const fields = document.createElement("div");
    fields.className = "scene-fields";
    SCENE_FIELDS.forEach(([key, label, multiline]) => {
      const box = document.createElement("div");
      if (multiline) box.className = "wide";
      const caption = document.createElement("label");
      caption.textContent = label;
      const input = document.createElement(multiline ? "textarea" : "input");
      if (multiline) input.rows = 3;
      else input.type = "text";
      input.value = String(scene[key] ?? "");
      input.addEventListener("input", () => { scene[key] = input.value; scheduleSave(); });
      box.append(caption, input);
      fields.append(box);
    });
    article.append(fields);
    const tools = document.createElement("div");
    tools.className = "actions";
    tools.style.marginTop = "12px";
    [["image_prompt", "Sao chép prompt ảnh"], ["video_prompt", "Sao chép prompt Flow"]].forEach(([key, label]) => {
      const copy = document.createElement("button");
      copy.className = "secondary";
      copy.textContent = label;
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(scene[key] || "");
          show("Đã sao chép: " + label + " — cảnh " + (index + 1));
        } catch (error) { show("Không thể sao chép: " + error.message, true); }
      });
      tools.append(copy);
    });
    article.append(tools);
    wrap.append(article);
  });
}
function download(name, mime, contents) {
  const href = URL.createObjectURL(new Blob([contents], { type: mime }));
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
}
function slug(name) {
  return (name || "video-studio").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "video-studio";
}
function csv() {
  const headers = ["STT", "Bắt đầu", "Kết thúc", "Mô tả", "Lời thoại", "Prompt ảnh", "Prompt Flow", "Ghi chú"];
  const esc = (x) => '"' + String(x ?? "").replace(/"/g, '""') + '"';
  const rows = [headers, ...project.scenes.map((s, i) => [
    i + 1, s.start, s.end, s.description, s.dialogue, s.image_prompt, s.video_prompt, s.notes
  ])];
  return "\uFEFF" + rows.map((row) => row.map(esc).join(",")).join("\r\n");
}
function getMime() {
  if (!videoFile) return "video/mp4";
  return videoFile.type || (videoFile.name.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4");
}
async function checked(response, label) {
  if (response.ok) return response;
  let info = "";
  try {
    const data = await response.json();
    info = data?.error?.message || JSON.stringify(data).slice(0, 500);
  } catch { info = (await response.text()).slice(0, 300); }
  throw new Error(label + " (" + response.status + "): " + info);
}
function setVideo(file) {
  if (!file) return;
  if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|m4v)$/i.test(file.name)) {
    show("Chỉ hỗ trợ video MP4, MOV, WebM, M4V.", true);
    return;
  }
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  videoFile = file;
  objectUrl = URL.createObjectURL(file);
  $("preview").src = objectUrl;
  $("preview").hidden = false;
  project.source.name = file.name;
  project.source.size = file.size;
  project.source.mime = getMime();
  project.source.duration = null;
  $("videoInfo").textContent = file.name + " · " + (file.size / 1048576).toFixed(1) + " MB";
  $("preview").onloadedmetadata = () => {
    if (Number.isFinite($("preview").duration)) {
      project.source.duration = $("preview").duration;
      scheduleSave();
    }
  };
  scheduleSave();
}

/* Gemini Files API, resumable chunk upload (no 640 MB file in memory). */
async function uploadGemini(file, key) {
  const mime = getMime();
  const auth = { "x-goog-api-key": key };
  const start = await fetch("https://generativelanguage.googleapis.com/upload/v1beta/files", {
    method: "POST",
    headers: {
      ...auth, "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(file.size),
      "X-Goog-Upload-Header-Content-Type": mime, "Content-Type": "application/json"
    },
    body: JSON.stringify({ file: { display_name: file.name } })
  });
  await checked(start, "Khởi tạo tải video lên Gemini");
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini không trả về URL upload. Kiểm tra quyền truy cập API.");
  let offset = 0;
  const chunk = 8 * 1024 * 1024;
  let finalFile = null;
  while (offset < file.size) {
    const end = Math.min(file.size, offset + chunk);
    const last = end === file.size;
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "X-Goog-Upload-Offset": String(offset),
        "X-Goog-Upload-Command": last ? "upload, finalize" : "upload",
        "Content-Type": mime
      },
      body: file.slice(offset, end)
    });
    await checked(response, "Truyền dữ liệu video");
    if (last) {
      const result = await response.json();
      finalFile = result.file || result;
    }
    offset = end;
    progress(Math.round(10 + 65 * offset / file.size), "Đang tải video lên Gemini: " + Math.round(100 * offset / file.size) + "%");
  }
  if (!finalFile?.name) throw new Error("Gemini chưa trả về thông tin file sau upload.");
  for (let tries = 0; tries < 90; tries++) {
    const result = await checked(await fetch(
      "https://generativelanguage.googleapis.com/v1beta/" + finalFile.name,
      { headers: auth }
    ), "Kiểm tra trạng thái Gemini");
    finalFile = await result.json();
    if (finalFile.state === "ACTIVE" || (!finalFile.state && finalFile.uri)) return finalFile;
    if (finalFile.state === "FAILED") throw new Error("Google báo lỗi xử lý video.");
    progress(78, "Gemini đang xử lý video: " + (tries + 1) + "/90");
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
  throw new Error("Video vẫn đang xử lý. Hãy thử lại sau khi video sẵn sàng.");
}
async function analyzeGemini(file, key) {
  if (file.size > 2 * 1024 ** 3) throw new Error("File lớn hơn giới hạn 2 GB của Gemini File API miễn phí.");
  const uploaded = await uploadGemini(file, key);
  const instructions = [
    "You are an expert video editor and director. Analyze the ACTUAL uploaded video carefully.",
    "Return one JSON object only, with properties: summary (string), scenes (array).",
    "Each scene must have string properties start, end, description, dialogue, image_prompt, video_prompt, notes.",
    "start/end = timestamp mm:ss (or hh:mm:ss for long videos). Segment by meaningful shot/action, not arbitrary equal time chunks.",
    "description = faithful visual description including composition, camera, motion, characters, lighting, style.",
    "dialogue = exact Vietnamese transcript ONLY when intelligible; otherwise empty string. Never invent quotations.",
    "notes = transitions, sound effects, music or uncertainty; distinguish fact from suggestion.",
    "image_prompt = high quality English still image prompt for the scene, preserving style and subject consistency.",
    "video_prompt = English image-to-video prompt compatible with Google Flow. Preserve identity and scene continuity.",
    "Target aspect ratio: " + project.aspect + ". Preferred response language: " + (project.language === "vi" ? "Vietnamese" : "English") + ".",
    "User adaptation instructions: " + (project.brief || "Preserve core structure of the reference video."),
    "Do not state that an uncertain visual or inaudible speech was observed.",
    "Favor practical, separately editable scenes; if the video is long, group logically (maximum 50 scenes)."
  ].join("\n");
  const request = {
    contents: [{ role: "user", parts: [
      { text: instructions },
      { file_data: { mime_type: uploaded.mimeType || getMime(), file_uri: uploaded.uri } }
    ] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
  };
  progress(87, "Đang phân tích cảnh và tạo storyboard bằng Gemini...");
  const response = await checked(await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(request) }
  ), "Gemini phân tích video");
  const data = await response.json();
  const output = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  if (!output) throw new Error("Gemini không trả về nội dung phân cảnh.");
  let parsed;
  try { parsed = JSON.parse(output); } catch { throw new Error("Gemini trả về JSON không hợp lệ; hãy phân tích lại."); }
  if (!Array.isArray(parsed.scenes) || !parsed.scenes.length) throw new Error("Không có phân cảnh hợp lệ trong kết quả.");
  return {
    summary: String(parsed.summary || ""),
    scenes: parsed.scenes.slice(0, 50).map((s) => ({
      id: crypto.randomUUID(),
      start: String(s.start || ""), end: String(s.end || ""),
      description: String(s.description || ""), dialogue: String(s.dialogue || ""),
      image_prompt: String(s.image_prompt || ""), video_prompt: String(s.video_prompt || ""),
      notes: String(s.notes || "")
    }))
  };
}

/* Direct Google Drive OAuth (drive.file = files created/opened by the extension only). */
async function connectDrive() {
  if (chrome.runtime.getManifest().oauth2.client_id.startsWith("REPLACE_")) {
    throw new Error("Chưa cấu hình OAuth Client ID cho Chrome Extension. Xem README.md trên GitHub.");
  }
  const result = await chrome.identity.getAuthToken({ interactive: true });
  driveToken = typeof result === "string" ? result : result?.token;
  if (!driveToken) throw new Error("Không nhận được quyền truy cập Google Drive.");
  show("Đã kết nối Drive. Dữ liệu sẽ lưu trong thư mục " + MAIN_FOLDER, false, "driveStatus");
  return driveToken;
}
async function driveRequest(url, options = {}) {
  if (!driveToken) await connectDrive();
  const headers = { ...(options.headers || {}), Authorization: "Bearer " + driveToken };
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    await chrome.identity.removeCachedAuthToken({ token: driveToken });
    driveToken = "";
    throw new Error("Phiên Drive đã hết hạn; bấm Kết nối Drive để cấp lại quyền.");
  }
  return checked(response, "Google Drive");
}
function driveQuery(q, fields = "nextPageToken,files(id,name,mimeType,webViewLink)") {
  return "https://www.googleapis.com/drive/v3/files?q=" + encodeURIComponent(q) +
    "&fields=" + encodeURIComponent(fields) + "&pageSize=100";
}
async function createFolder(name, parentId) {
  const result = await driveRequest("https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: parentId ? [parentId] : undefined })
  });
  return result.json();
}
async function findFolder(name, parentId) {
  const safe = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const parentCondition = parentId ? " and '" + parentId + "' in parents" : " and 'root' in parents";
  const query = "name = '" + safe + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false" + parentCondition;
  const response = await driveRequest(driveQuery(query));
  const obj = await response.json();
  return obj.files?.[0] || null;
}
async function ensureRoot() {
  if (rootFolderId) return rootFolderId;
  const local = await chrome.storage.local.get("videoStudioRootId");
  if (local.videoStudioRootId) {
    rootFolderId = local.videoStudioRootId;
    return rootFolderId;
  }
  const folder = await findFolder(MAIN_FOLDER) || await createFolder(MAIN_FOLDER);
  rootFolderId = folder.id;
  await chrome.storage.local.set({ videoStudioRootId: rootFolderId });
  return rootFolderId;
}
async function ensureProjectFolder() {
  if (project.driveFolderId) return project.driveFolderId;
  const root = await ensureRoot();
  // Keep folder names short and natural; unique identity lives in project.json.
  const folder = await createFolder(project.name || "Dự án mới", root);
  project.driveFolderId = folder.id;
  await saveLocal();
  return folder.id;
}
async function uploadJson(folder, fileName, content) {
  const boundary = "dhl_boundary_" + crypto.randomUUID().replaceAll("-", "");
  const metadata = JSON.stringify({ name: fileName, mimeType: "application/json", parents: [folder] });
  const body = new Blob([
    "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n",
    metadata, "\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n",
    content, "\r\n--" + boundary + "--"
  ], { type: "multipart/related; boundary=" + boundary });
  const response = await driveRequest("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
    method: "POST", headers: { "Content-Type": body.type }, body
  });
  return response.json();
}
async function saveDrive() {
  syncProject();
  const folderId = await ensureProjectFolder();
  const contents = JSON.stringify(project, null, 2);
  let file;
  if (project.driveFileId) {
    const response = await driveRequest(
      "https://www.googleapis.com/upload/drive/v3/files/" + encodeURIComponent(project.driveFileId) + "?uploadType=media&fields=id,name",
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: contents }
    );
    file = await response.json();
  } else {
    file = await uploadJson(folderId, "project.json", contents);
    project.driveFileId = file.id;
    // Write back actual Drive file ID for future updates.
    const response = await driveRequest(
      "https://www.googleapis.com/upload/drive/v3/files/" + encodeURIComponent(file.id) + "?uploadType=media",
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project, null, 2) }
    );
    await response.json();
  }
  await saveLocal();
  show("Đã lưu project.json vào Google Drive.", false, "driveStatus");
}
async function refreshProjects() {
  const root = await ensureRoot();
  const response = await driveRequest(driveQuery(
    "'" + root + "' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  ));
  const data = await response.json();
  const select = $("projects");
  select.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Chọn dự án";
  select.append(placeholder);
  for (const f of data.files || []) {
    const option = document.createElement("option");
    option.value = f.id;
    option.textContent = f.name;
    select.append(option);
  }
  show("Có " + (data.files || []).length + " thư mục dự án. Chọn dự án để mở.", false, "driveStatus");
}
async function loadProject() {
  const folderId = $("projects").value;
  if (!folderId) throw new Error("Chưa chọn dự án.");
  const list = await driveRequest(driveQuery(
    "'" + folderId + "' in parents and name = 'project.json' and trashed = false"
  ));
  const data = await list.json();
  const file = data.files?.[0];
  if (!file) throw new Error("Thư mục không có project.json.");
  const response = await driveRequest("https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(file.id) + "?alt=media");
  const loaded = await response.json();
  if (!Array.isArray(loaded.scenes)) throw new Error("Cấu trúc project.json không hợp lệ.");
  project = { ...defaults(), ...loaded, driveFolderId: folderId, driveFileId: file.id };
  project.scenes = loaded.scenes.map((s) => ({ ...s, id: s.id || crypto.randomUUID() }));
  videoFile = null;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  $("preview").hidden = true;
  hydrate();
  await saveLocal();
  show("Đã mở dự án từ Drive.", false, "driveStatus");
}

/* Optional upload original video to the same Drive project folder, via Drive resumable upload. */
async function uploadDriveVideo() {
  if (!videoFile) throw new Error("Chọn video trên máy trước khi tải lên Drive.");
  if (project.driveVideoId && !confirm("Dự án đã có video trên Drive. Tải thêm một bản mới?")) return;
  const folder = await ensureProjectFolder();
  const mime = getMime();
  const session = await driveRequest("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Upload-Content-Type": mime,
      "X-Upload-Content-Length": String(videoFile.size)
    },
    body: JSON.stringify({ name: videoFile.name, mimeType: mime, parents: [folder] })
  });
  const uploadUrl = session.headers.get("location");
  if (!uploadUrl) throw new Error("Drive không trả URL để tải video lên.");
  const chunkSize = 8 * 1024 * 1024;
  let offset = 0, completed = null;
  while (offset < videoFile.size) {
    const end = Math.min(videoFile.size, offset + chunkSize);
    // Drive returns 308 Resume Incomplete until the last chunk.
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mime,
        "Content-Range": "bytes " + offset + "-" + (end - 1) + "/" + videoFile.size
      },
      body: videoFile.slice(offset, end)
    });
    if (response.status !== 308 && !response.ok) await checked(response, "Tải video lên Drive");
    if (response.ok && end === videoFile.size) completed = await response.json();
    offset = end;
    progress(100 * offset / videoFile.size, "Tải video lên Drive " + Math.round(100 * offset / videoFile.size) + "%");
  }
  if (!completed?.id) throw new Error("Chưa xác nhận được video đã lưu trên Drive.");
  project.driveVideoId = completed.id;
  if (!project.source.url) project.source.url = "https://drive.google.com/file/d/" + completed.id + "/view";
  $("sourceUrl").value = project.source.url;
  await saveDrive();
  show("Video đã tải lên Drive và đã cập nhật dự án.", false, "driveStatus");
}

function guard(task, name = "Thao tác") {
  return async () => {
    if (busy) return;
    setBusy(true);
    try { await task(); } catch (e) {
      show(name + ": " + (e?.message || String(e)), true);
      if (name.toLowerCase().includes("drive")) show(e?.message || String(e), true, "driveStatus");
    } finally { setBusy(false); }
  };
}
function bind() {
  ["projectName", "brief", "aspect", "language", "sourceUrl"].forEach((id) => {
    $(id).addEventListener("input", scheduleSave);
  });
  $("videoFile").addEventListener("change", (event) => setVideo(event.target.files?.[0]));
  $("localSave").addEventListener("click", guard(saveLocal, "Lưu nháp"));
  $("addScene").addEventListener("click", () => addScene());
  $("exportJson").addEventListener("click", () => {
    syncProject();
    download(slug(project.name) + ".json", "application/json;charset=utf-8", JSON.stringify(project, null, 2));
  });
  $("exportCsv").addEventListener("click", () => {
    syncProject();
    download(slug(project.name) + ".csv", "text/csv;charset=utf-8", csv());
  });
  $("analyzeBtn").addEventListener("click", guard(async () => {
    if (!videoFile) throw new Error("Chọn video trên máy trước.");
    const key = $("apiKey").value.trim();
    if (!key) throw new Error("Chưa có Gemini API key.");
    await chrome.storage.session.set({ videoStudioGeminiKey: key });
    syncProject();
    progress(3, "Khởi tạo tải video lên Gemini...");
    const result = await analyzeGemini(videoFile, key);
    if (project.scenes.length && !confirm("Thay toàn bộ phân cảnh hiện tại bằng kết quả mới?")) {
      show("Đã giữ nguyên phân cảnh cũ.");
      return;
    }
    project.scenes = result.scenes;
    renderScenes();
    await saveLocal();
    progress(100, "Đã phân tích " + result.scenes.length + " cảnh. " + result.summary);
  }, "Phân tích"));
  $("connectDrive").addEventListener("click", guard(connectDrive, "Kết nối Drive"));
  $("refreshProjects").addEventListener("click", guard(refreshProjects, "Danh sách Drive"));
  $("loadProject").addEventListener("click", guard(loadProject, "Mở dự án Drive"));
  $("driveSave").addEventListener("click", guard(saveDrive, "Lưu Drive"));
  $("driveUploadVideo").addEventListener("click", guard(uploadDriveVideo, "Tải video Drive"));
  window.addEventListener("beforeunload", () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  });
}
async function init() {
  bind();
  try {
    const data = await chrome.storage.local.get(["videoStudioDraft", "videoStudioRootId"]);
    if (data.videoStudioDraft && Array.isArray(data.videoStudioDraft.scenes)) {
      project = { ...defaults(), ...data.videoStudioDraft };
      $("saveStatus").textContent = "Đã khôi phục bản nháp";
    }
    rootFolderId = data.videoStudioRootId || "";
    const session = await chrome.storage.session.get("videoStudioGeminiKey");
    $("apiKey").value = session.videoStudioGeminiKey || "";
    hydrate();
  } catch (e) {
    show("Lỗi đọc bản nháp: " + e.message, true);
  }
}
init();