let canvas, ctx, targetW = 295, targetH = 413
function getWinInfo(){ if(wx.getWindowInfo) return wx.getWindowInfo(); return wx.getSystemInfoSync(); }
Page({
  data:{
    baseImage:null,
    preset:'1inch',
    targetSize:{ w:295, h:413 },
    scalePercent:100,
    offsetX:0,
    offsetY:0,
    bgColor:'#ffffff',
    bgPalette:['#ffffff','#ff0000','#0066ff','#10b981','#f59e0b'],
    bgHex:'ffffff',
    replaceBg:false,
    tolerance:20,
    composed:false,
    previewH:300
  },
  async pickBase(){
    try{
      const res = await wx.chooseMedia({count:1, mediaType:['image'], sizeType:['original','compressed'], sourceType:['album','camera']})
      if(!res || !res.tempFiles || !res.tempFiles.length) return
      const f = res.tempFiles[0]
      this.setData({ baseImage:{ path: f.tempFilePath || '', size: f.size || 0 } })
      wx.showToast({ title:'已选择照片', icon:'success' })
    }catch(e){ if(!(e && (e.errMsg||'').includes('cancel'))) wx.showToast({title:'选择失败', icon:'none'}) }
  },
  onPresetChange(e){
    const v = e.detail.value
    const size = v==='2inch' ? { w:413, h:579 } : { w:295, h:413 }
    targetW = size.w; targetH = size.h
    this.setData({ preset:v, targetSize:size });
    this.composePreview()
  },
  onScaleChanging(e){ this.setData({ scalePercent: e.detail.value }); this.composePreview() },
  onScaleChange(e){ this.setData({ scalePercent: e.detail.value }); this.composePreview() },
  onOffsetXChanging(e){ this.setData({ offsetX: e.detail.value }); this.composePreview() },
  onOffsetXChange(e){ this.setData({ offsetX: e.detail.value }); this.composePreview() },
  onOffsetYChanging(e){ this.setData({ offsetY: e.detail.value }); this.composePreview() },
  onOffsetYChange(e){ this.setData({ offsetY: e.detail.value }); this.composePreview() },
  setBgColor(e){ this.setData({ bgColor: e.currentTarget.dataset.color }); this.composePreview() },
  onBgHexInput(e){ const v = ('#'+(e.detail.value||'').replace(/[^0-9a-fA-F]/g,'')); this.setData({ bgHex: v.replace('#',''), bgColor: v }); this.composePreview() },
  toggleReplaceBg(e){ this.setData({ replaceBg: e.detail.value }); this.composePreview() },
  onToleranceChanging(e){ this.setData({ tolerance: e.detail.value }); this.composePreview() },
  onToleranceChange(e){ this.setData({ tolerance: e.detail.value }); this.composePreview() },
  async composePreview(){
    try{
      if(!this.data.baseImage) return
      const query = wx.createSelectorQuery().in(this)
      const fields = await new Promise(ok=>{ query.select('#cvs').fields({node:true,size:true}).exec(ok) })
      const node = fields && fields[0] && fields[0].node
      if(!node) return wx.showToast({ title:'无法初始化画布', icon:'none' })
      const img = node.createImage()
      await new Promise(r=>{ img.onload=r; img.onerror=r; img.src=this.data.baseImage.path })
      targetW = this.data.targetSize.w; targetH = this.data.targetSize.h
      const box = await new Promise(ok=>{ wx.createSelectorQuery().in(this).select('#canvasBox').boundingClientRect().exec(res=>ok(res && res[0])) })
      const win = getWinInfo()
      const cssW = (box && box.width) ? box.width : win.windowWidth
      const previewH = Math.ceil(cssW * targetH / targetW)
      const dpr = win.pixelRatio || 2
      const pvW = Math.round(cssW * dpr)
      const pvH = Math.round(previewH * dpr)
      node.width = pvW
      node.height = pvH
      ctx = node.getContext('2d')
      canvas = node
      const scale = pvW / targetW
      ctx.setTransform(scale,0,0,scale,0,0)
      ctx.clearRect(0,0,targetW,targetH)
      ctx.fillStyle = this.data.bgColor || '#ffffff'
      ctx.fillRect(0,0,targetW,targetH)
      const s = Math.max(0.5, Math.min(2, Number(this.data.scalePercent)||100/100))
      const baseScale = (targetW / img.width) * (this.data.scalePercent/100)
      const drawW = Math.round(img.width * baseScale)
      const drawH = Math.round(img.height * baseScale)
      const x = Math.round((targetW - drawW)/2 + Number(this.data.offsetX||0))
      const y = Math.round((targetH - drawH)/2 + Number(this.data.offsetY||0))
      ctx.drawImage(img, x, y, drawW, drawH)
      if(this.data.replaceBg){
        const tol = Math.max(0, Math.min(255, Number(this.data.tolerance)||20))
        const data = ctx.getImageData(0,0,targetW,targetH)
        const arr = data.data
        const col = this._parseHexColor(this.data.bgColor||'#ffffff')
        for(let i=0;i<arr.length;i+=4){
          const r=arr[i], g=arr[i+1], b=arr[i+2]
          if(r>=255-tol && g>=255-tol && b>=255-tol){ arr[i]=col.r; arr[i+1]=col.g; arr[i+2]=col.b }
        }
        ctx.putImageData(data,0,0)
      }
      this.setData({ previewH, composed:true })
      wx.showToast({ title:'预览生成', icon:'none' })
    }catch(e){ wx.showToast({ title:'生成失败', icon:'none' }) }
  },
  _parseHexColor(hex){
    const h=(hex||'#ffffff').replace('#','')
    const v=h.length===6?h:('ffffff')
    const r=parseInt(v.slice(0,2),16), g=parseInt(v.slice(2,4),16), b=parseInt(v.slice(4,6),16)
    return { r, g, b }
  },
  async exportImage(){
    try{
      if(!this.data.composed || !this.data.baseImage) return wx.showToast({ title:'请先生成预览', icon:'none' })
      const query = wx.createSelectorQuery().in(this)
      const fields = await new Promise(ok=>{ query.select('#cvs').fields({node:true,size:true}).exec(ok) })
      const node = fields && fields[0] && fields[0].node
      if(!node) return wx.showToast({ title:'无法初始化画布', icon:'none' })
      const img = node.createImage()
      await new Promise(r=>{ img.onload=r; img.onerror=r; img.src=this.data.baseImage.path })
      targetW = this.data.targetSize.w; targetH = this.data.targetSize.h
      node.width = targetW
      node.height = targetH
      const _ctx = node.getContext('2d')
      _ctx.setTransform(1,0,0,1,0,0)
      _ctx.clearRect(0,0,targetW,targetH)
      _ctx.fillStyle = this.data.bgColor || '#ffffff'
      _ctx.fillRect(0,0,targetW,targetH)
      const baseScale = (targetW / img.width) * (this.data.scalePercent/100)
      const drawW = Math.round(img.width * baseScale)
      const drawH = Math.round(img.height * baseScale)
      const x = Math.round((targetW - drawW)/2 + Number(this.data.offsetX||0))
      const y = Math.round((targetH - drawH)/2 + Number(this.data.offsetY||0))
      _ctx.drawImage(img, x, y, drawW, drawH)
      if(this.data.replaceBg){
        const tol = Math.max(0, Math.min(255, Number(this.data.tolerance)||20))
        const data = _ctx.getImageData(0,0,targetW,targetH)
        const arr = data.data
        const col = this._parseHexColor(this.data.bgColor||'#ffffff')
        for(let i=0;i<arr.length;i+=4){
          const r=arr[i], g=arr[i+1], b=arr[i+2]
          if(r>=255-tol && g>=255-tol && b>=255-tol){ arr[i]=col.r; arr[i+1]=col.g; arr[i+2]=col.b }
        }
        _ctx.putImageData(data,0,0)
      }
      const tempFilePath = await new Promise((resolve,reject)=>{
        wx.canvasToTempFilePath({ canvas: node, fileType:'png', quality:1, success:res=>resolve(res.tempFilePath), fail:reject })
      })
      await wx.saveImageToPhotosAlbum({ filePath: tempFilePath })
      wx.showToast({ title:'已保存到相册', icon:'success' })
    }catch(e){ wx.showToast({ title:'导出失败', icon:'none' }) }
  },
  onShareAppMessage() {
    return {
      title: '证件照处理工具',
      path: `/${this.route}`
    }
  },
  onShareTimeline() {
    return {
      title: '证件照处理工具'
    }
  }
})
