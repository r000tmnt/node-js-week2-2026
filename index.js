const http = require('node:http');
const fs = require('node:fs');
const { formidable } = require('formidable');  // formidable v3 用 named import

// ========== 任務一：讀取上傳設定 ==========
/**
 * 從 process.env 讀取上傳相關設定，回傳設定物件。
 *
 * 規則：
 *   - UPLOAD_DIR 未設定 → 預設 '/tmp'
 *   - MAX_FILE_SIZE_MB 未設定 → 預設 5（MB）
 *   - GYM_NAME 未設定 → 預設 '未命名健身房'
 *
 * 回傳物件：
 *   - uploadDir: 上傳目錄（字串）
 *   - maxFileSize: 最大檔案大小（bytes，= MB * 1024 * 1024）
 *   - gymName: 健身房名稱（字串）
 *
 * @returns {{uploadDir: string, maxFileSize: number, gymName: string}}
 *
 * @example
 *   process.env.UPLOAD_DIR = '/tmp/uploads';
 *   process.env.MAX_FILE_SIZE_MB = '10';
 *   process.env.GYM_NAME = 'FitClub';
 *   getUploadConfig();
 *   // { uploadDir: '/tmp/uploads', maxFileSize: 10485760, gymName: 'FitClub' }
 */
function getUploadConfig() {
  // TODO: 實作此函式
  // 提示：用 || 給預設值；MAX_FILE_SIZE_MB 是字串，記得先 Number() 轉型再換算 bytes
  try {
    const setting = process.env
    const size = Number(setting.MAX_FILE_SIZE_MB) || 5
    // console.log(setting)
    return { 
      uploadDir: setting.UPLOAD_DIR || '/tmp', 
      maxFileSize: size * 1024 * 1024,
      gymName: setting.GYM_NAME || '未命名健身房'
    }
  } catch (error) {
    console.log(error)
    return {
      uploadDir: '/tmp',
      maxFileSize: 5  * 1024 * 1024,
      gymName: '未命名健身房'
    }
  }
}

// ========== 任務二：取副檔名 ==========
/**
 * 從檔名取副檔名，一律回小寫帶 `.`。
 *
 * 規則：
 *   - 'cat.jpg' → '.jpg'
 *   - 'PHOTO.JPG' → '.jpg'（一律小寫）
 *   - 'README' → ''（沒有副檔名）
 *   - 'archive.tar.gz' → '.gz'（只取最後一個）
 *
 * @param {string} filename
 * @returns {string}
 *
 * @example
 *   getFileExtension('cat.jpg');     // '.jpg'
 *   getFileExtension('PHOTO.JPG');   // '.jpg'
 *   getFileExtension('README');      // ''
 */
function getFileExtension(filename) {
  // TODO: 實作此函式
  // 提示：用 lastIndexOf('.') 找最後一個 .，toLowerCase() 轉小寫
  try {
    const target = filename.lastIndexOf('.')
    if(target < 0){
      return ''
    }else{
      const extension = filename.substring(target)
      return extension.toLowerCase()      
    }
  } catch (error) {
    console.log(error)
    return error.message
  }
}

// ========== 任務三：解析檔案 metadata ==========
/**
 * 吃 formidable 解析後的 file 物件，回傳整理好的 metadata。
 *
 * formidable 的 file 物件至少有：
 *   - originalFilename: 原始檔名
 *   - size: 檔案 byte 數
 *
 * 回傳：
 *   - filename: 原始檔名
 *   - sizeKB: 檔案大小換成 KB（四捨五入，用 Math.round）
 *   - ext: 副檔名（用任務二的 getFileExtension）
 *
 * @param {{originalFilename: string, size: number}} file
 * @returns {{filename: string, sizeKB: number, ext: string}}
 *
 * @example
 *   parseFileMetadata({ originalFilename: 'leo.jpg', size: 250000 });
 *   // { filename: 'leo.jpg', sizeKB: 244, ext: '.jpg' }
 */
function parseFileMetadata(file) {
  // TODO: 實作此函式
  // 提示：呼叫 getFileExtension 取副檔名，Math.round(size / 1024) 算 KB
  try {
    const extension = getFileExtension(file.originalFilename)
    const size = Math.round(file.size / 1024)

    return {
      filename: file.originalFilename,
      sizeKB: size,
      ext: extension
    }
  } catch (error) {
    console.log(error)
    return error.message
  }
}

// ========== 任務四：產出 upload log 字串 ==========
/**
 * 吃 metadata + config，產出一行 log 字串。
 *
 * 格式：`[{gymName}] Uploaded {filename} ({sizeKB} KB) → {uploadDir}`
 *
 * @param {{filename: string, sizeKB: number}} meta
 * @param {{uploadDir: string, gymName: string}} config
 * @returns {string}
 *
 * @example
 *   formatUploadLog(
 *     { filename: 'leo.jpg', sizeKB: 245, ext: '.jpg' },
 *     { uploadDir: '/tmp/uploads', gymName: 'FitClub' }
 *   );
 *   // '[FitClub] Uploaded leo.jpg (245 KB) → /tmp/uploads'
 */
function formatUploadLog(meta, config) {
  // TODO: 實作此函式
  // 提示：用 template literal 組字串
  try {
    const { filename, sizeKB } = meta
    const { uploadDir, gymName } = config
    return `[${gymName}] Uploaded ${filename} (${sizeKB} KB) → ${uploadDir}`
  } catch (error) {
    console.log(error)
    return error.message
  }
}

// ========== 任務五：路由分派 ==========
/**
 * 吃 HTTP request / response / config，依 method + url 分派到對應處理邏輯。
 *
 * 規格：
 *   - POST /coaches/avatar：
 *     * 用 formidable 解析 multipart/form-data
 *     * 成功 → 回 200 + JSON { filename, sizeKB, ext, savedPath }
 *     * formidable 解析錯誤（含超過 maxFileSize）→ 回 500 + JSON { error }
 *     * 沒 file 欄位 → 回 400 + JSON { error: 'No file uploaded' }
 *   - 其他路徑 → 回 404 + JSON { error: 'Not Found' }
 *
 * formidable 設定：
 *   - uploadDir / maxFileSize 從 config 取
 *   - keepExtensions: true
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {{uploadDir: string, maxFileSize: number, gymName: string}} config
 * @returns {void} 直接操作 res 回寫、不 return 值
 *
 * @example
 *   // 在 createUploadServer 裡：
 *   http.createServer((req, res) => router(req, res, config))
 */
function router(req, res, config) {
  // TODO: 實作此函式
  // 建議（非強制）：
  //   - 拆出 handleUpload(req, res, config)：formidable 解析邏輯
  //   - 拆出 handleNotFound(req, res)：404 邏輯
  //   - router 只看 method + url、呼叫對應 handler
  // formidable 錯誤處理要點：
  //   - 超過 maxFileSize 時 formidable v3 發 'error' event，要用 form.on('error', ...) 接
  //   - 同時 form.parse 的 callback err 也要處理
  //   - 避免重複 res.writeHead（檢查 res.headersSent）
  try {
    const header = {
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PATCH, POST, GET,OPTIONS,DELETE',
        'Content-Type': 'application/json'
    }

    switch(req.method){
      case 'GET':
        // console.log(req.url)
        if(req.url === '/'){
          res.writeHead(404, header)
          res.write(JSON.stringify({ "success": false, "error": 'Not found' }))
          res.end()              
        }
        return
      case 'POST':
        if(req.url === '/coaches/avatar'){
          const form = formidable({ uploadDir: config.uploadDir, maxFieldsSize: config.maxFileSize, keepExtensions: true })

          form.on('error', (err) => {
            console.log('form on error', err)
              res.writeHead(500, header)
              res.write(JSON.stringify({ "success": false, "error": err }))
              res.end()    
          })

          form.parse(req, (err, fields, files) => {
            // console.log('files', files)
            if(err){
              console.log('err', err)
              res.writeHead(400, header)
              res.write(JSON.stringify({ "success": false, "message": err }))
              res.end()    
              return
            }

            if(files.file){
              const meta = parseFileMetadata(files.file[0])
              console.log('meta', meta)

              // Check file size
              if((meta.sizeKB * 1024) > config.maxFileSize){
                res.writeHead(500, header)
                res.write(JSON.stringify({ "success": false, "error": `File size limited to ${Math.round(config.maxFileSize / 1024)}KB` }))
                res.end()   
              }else{
                res.writeHead(200, header)
                res.write(JSON.stringify({
                    filename: meta.filename,
                    sizeKB: meta.sizeKB,
                    ext: meta.ext,
                    savedPath: config.uploadDir
                  } ))
                res.end()                 
              }
            }else{
              res.writeHead(400, header)
              res.write(JSON.stringify({ "success": false, "error": 'No file uploaded' }))
              res.end()   
            } 
          })
        }else{
          res.writeHead(404, header)
          res.write(JSON.stringify({ "success": false, "message": 'Not found' }))
          res.end()  
        }
        return
    }
  } catch (error) {
    
  }
}

// ========== 任務六：建立上傳 server ==========
/**
 * 建 http.Server、把每個 request 交給 router。
 *
 * 規格：
 *   - 如果 config.uploadDir 不存在，用 fs.mkdirSync(uploadDir, { recursive: true }) 自動建
 *   - http.createServer(...) 把 request 交給 router(req, res, config)
 *   - 回傳 server instance（不要 server.listen()，那是 app.js 的責任）
 *
 * @param {{uploadDir: string, maxFileSize: number}} config
 * @returns {http.Server}
 *
 * @example
 *   const server = createUploadServer({ uploadDir: '/tmp', maxFileSize: 5 * 1024 * 1024 });
 *   server.listen(3000);  // ← 這行由 app.js 呼叫
 */
function createUploadServer(config) {
  // TODO: 實作此函式
  // 提示：主邏輯都在 router 裡，這邊函式內容不多
  if(!fs.existsSync(config.uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  return http.createServer((req, res) => {
    router(req, res, config)
  })
}

module.exports = {
  getUploadConfig,
  getFileExtension,
  parseFileMetadata,
  formatUploadLog,
  router,
  createUploadServer,
};
