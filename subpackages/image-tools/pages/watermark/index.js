let canvas, ctx, realW = 1080, realH = 0
function getWinInfo(){ if(wx.getWindowInfo) return wx.getWindowInfo(); return wx.getSystemInfoSync(); }
Page({
  data:{
    baseImage:null,
    textContent:'',
    sizePercent:10,
    textColor:'#000000',
    colorPalette:['#000000','#ffffff','#ef4444','#f59e0b','#84cc16','#22c55e','#10b981','#0ea5e9','#3b82f6','#6366f1','#a855f7','#64748b'],
    opacityPercent:30,
    tileDensity:5,
    minSpacingPercent:10,
    mode:'single',
    angleDiagonal:false,
    position:'center',
    offsetX:0,
    offsetY:0,
    composed:false,
    previewH:300,
    fontProg:0,
    opacityProg:0,
    densityProg:0
  },
  onLoad(){ this._updateFontProg(); this._updateOpacityProg(); this._updateDensityProg(); },
  async pickBase(){
    try{
      const res = await wx.chooseMedia({count:1, mediaType:['image'], sizeType:['original','compressed'], sourceType:['album','camera']})
      if(!res || !res.tempFiles || !res.tempFiles.length) return
      const f = res.tempFiles[0]
      this.setData({ baseImage:{ path: f.tempFilePath || '', size: f.size || 0 } })
      wx.showToast({ title:'已选择图片', icon:'success' })
    }catch(e){ if(!(e && (e.errMsg||'').includes('cancel'))) wx.showToast({title:'选择失败', icon:'none'}) }
  },
  onTextInput(e){ this.setData({ textContent: e.detail.value }); this.composePreview() },
  onSizePercentChanging(e){ this.setData({ sizePercent: e.detail.value }); this.composePreview() },
  onSizePercentChange(e){ this.setData({ sizePercent: e.detail.value }); this.composePreview() },
  selectTextColor(e){ this.setData({ textColor: e.currentTarget.dataset.color }); this.composePreview() },
  onTextColorHex(e){ const v = ('#'+(e.detail.value||'').replace(/[^0-9a-fA-F]/g,'')); this.setData({ textColor: v }); this.composePreview() },
  onOpacityChanging(e){ this.setData({ opacityPercent: e.detail.value }); this._updateOpacityProg(); this.composePreview() },
  onOpacityChange(e){ this.setData({ opacityPercent: e.detail.value }); this._updateOpacityProg(); this.composePreview() },
  onTileDensityChanging(e){ this.setData({ tileDensity: e.detail.value }); this._updateDensityProg(); this.composePreview() },
  onTileDensityChange(e){ this.setData({ tileDensity: e.detail.value }); this._updateDensityProg(); this.composePreview() },
  onMinSpacingChanging(e){ this.setData({ minSpacingPercent: e.detail.value }); this.composePreview() },
  onMinSpacingChange(e){ this.setData({ minSpacingPercent: e.detail.value }); this.composePreview() },
  _updateFontProg(){ const v = Number(this.data.sizePercent)||1; const p = (v-1)/(20-1)*100; this.setData({ fontProg: Math.max(0, Math.min(100, Math.round(p))) }) },
  _updateOpacityProg(){ const v = Number(this.data.opacityPercent)||10; const p = (v-10)/(100-10)*100; this.setData({ opacityProg: Math.max(0, Math.min(100, Math.round(p))) }) },
  _updateDensityProg(){ const v = Number(this.data.tileDensity)||1; const p = (v-1)/(10-1)*100; this.setData({ densityProg: Math.max(0, Math.min(100, Math.round(p))) }) },
  onModeChange(e){ this.setData({ mode: e.detail.value }); this.composePreview() },
  onAngleChange(e){ this.setData({ angleDiagonal: e.detail.value === 'diagonal' }); this.composePreview() },
  onPositionChange(e){ this.setData({ position: e.detail.value }); this.composePreview() },
  onOffsetX(e){ this.setData({ offsetX: Number(e.detail.value||0) }); this.composePreview() },
  onOffsetY(e){ this.setData({ offsetY: Number(e.detail.value||0) }); this.composePreview() },
  async composePreview(){
    try{
      if(!this.data.baseImage) return
      const query = wx.createSelectorQuery().in(this)
      const fields = await new Promise(ok=>{ query.select('#cvs').fields({node:true,size:true}).exec(ok) })
      const node = fields && fields[0] && fields[0].node
      if(!node) return wx.showToast({ title:'无法初始化画布', icon:'none' })

      const base = node.createImage()
      await new Promise(r=>{ base.onload=r; base.onerror=r; base.src=this.data.baseImage.path })
      if(!base.width || !base.height) return wx.showToast({ title:'图片加载失败', icon:'none' })

      realW = base.width
      realH = base.height

      const box = await new Promise(ok=>{ wx.createSelectorQuery().in(this).select('#canvasBox').boundingClientRect().exec(res=>ok(res && res[0])) })
      const win = getWinInfo()
      const cssW = (box && box.width) ? box.width : win.windowWidth
      const previewH = Math.ceil(cssW * realH / realW)
      const dpr = win.pixelRatio || 2
      const pvW = Math.round(cssW * dpr)
      const pvH = Math.round(previewH * dpr)
      node.width = pvW
      node.height = pvH
      ctx = node.getContext('2d')
      canvas = node
      const scale = pvW / realW
      ctx.setTransform(scale,0,0,scale,0,0)

      ctx.clearRect(0,0,realW,realH)
      ctx.drawImage(base,0,0,realW,realH)

      const opacity = Math.max(0.1, Math.min(1, this.data.opacityPercent/100))
      ctx.globalAlpha = opacity
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      const text = this.data.textContent || ''
      if(text){
        const pct = Math.max(1, Math.min(20, Number(this.data.sizePercent)||10))
        const fs = Math.max(8, Math.round(realW * pct / 100))
        ctx.font = fs + 'px sans-serif'
        ctx.fillStyle = this.data.textColor || '#000000'
        if(this.data.mode==='tile'){
          const angle = this.data.angleDiagonal ? -Math.PI/4 : 0
          const m = ctx.measureText(text)
          const textW = Math.max(1, m.width)
          const rotFactor = this.data.angleDiagonal ? 1.3 : 1
          const wEff = Math.round(textW * rotFactor)
          const hEff = Math.round(fs * rotFactor)
          const padding = Math.max(0, Math.round(fs * (Number(this.data.minSpacingPercent)||0) / 100))
          const minStepX = wEff + padding
          const minStepY = hEff + padding
          const den = Math.max(1, Number(this.data.tileDensity)||5) // 1..10, 10最密
          const extra = Math.round((10 - den) * fs * 0.2) // 额外间距，密度越高越小
          const stepX = minStepX + extra
          const stepY = minStepY + extra
          for(let y= -stepY; y<realH + stepY; y+=stepY){
            for(let x= -stepX; x<realW + stepX; x+=stepX){
              ctx.save()
              ctx.translate(x,y)
              ctx.rotate(angle)
              ctx.textAlign = angle ? 'center' : 'left'
              ctx.textBaseline = angle ? 'middle' : 'top'
              ctx.fillText(text,0,0)
              ctx.restore()
            }
          }
        }else{
          const metrics = ctx.measureText(text)
          const w = Math.max(1, metrics.width)
          const h = fs
          const pos = this._calcPos(w,h)
          ctx.save()
          if(this.data.angleDiagonal){
            ctx.translate(pos.x + w/2, pos.y + h/2)
            ctx.rotate(-Math.PI/4)
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(text, 0, 0)
          }else{
            ctx.textAlign = 'left'
            ctx.textBaseline = 'top'
            ctx.fillText(text, pos.x, pos.y)
          }
          ctx.restore()
        }
      }

      ctx.globalAlpha = 1
      this.setData({ previewH, composed:true })
      wx.showToast({ title:'预览生成', icon:'none' })
    }catch(e){ wx.showToast({ title:'生成失败', icon:'none' }) }
  },
  _calcPos(w,h){
    const pad = 24
    let x = pad, y = pad
    const pos = this.data.position
    if(pos==='top-left'){ x=pad; y=pad }
    else if(pos==='top-right'){ x=realW - w - pad; y=pad }
    else if(pos==='bottom-left'){ x=pad; y=realH - h - pad }
    else if(pos==='bottom-right'){ x=realW - w - pad; y=realH - h - pad }
    else { x=(realW - w)/2; y=(realH - h)/2 }
    return { x: Math.max(0, Math.min(realW - w, x)), y: Math.max(0, Math.min(realH - h, y)) }
  },
  async exportImage(){
    try{
      if(!this.data.composed || !this.data.baseImage) return wx.showToast({ title:'请先生成预览', icon:'none' })
      const query = wx.createSelectorQuery().in(this)
      const fields = await new Promise(ok=>{ query.select('#cvs').fields({node:true,size:true}).exec(ok) })
      const node = fields && fields[0] && fields[0].node
      if(!node) return wx.showToast({ title:'无法初始化画布', icon:'none' })
      const base = node.createImage()
      await new Promise(r=>{ base.onload=r; base.onerror=r; base.src=this.data.baseImage.path })
      realW = base.width
      realH = base.height
      node.width = realW
      node.height = realH
      const _ctx = node.getContext('2d')
      _ctx.setTransform(1,0,0,1,0,0)
      _ctx.clearRect(0,0,realW,realH)
      _ctx.drawImage(base,0,0,realW,realH)
      const opacity = Math.max(0.1, Math.min(1, this.data.opacityPercent/100))
      _ctx.globalAlpha = opacity
      {
        const text = this.data.textContent || ''
        if(text){
          const pct = Math.max(1, Math.min(20, Number(this.data.sizePercent)||10))
          const fs = Math.max(8, Math.round(realW * pct / 100))
          _ctx.font = fs + 'px sans-serif'
          _ctx.fillStyle = this.data.textColor || '#000000'
          if(this.data.mode==='tile'){
            const angle = this.data.angleDiagonal ? -Math.PI/4 : 0
            const m = _ctx.measureText(text)
            const textW = Math.max(1, m.width)
            const rotFactor = this.data.angleDiagonal ? 1.3 : 1
            const wEff = Math.round(textW * rotFactor)
            const hEff = Math.round(fs * rotFactor)
            const padding = Math.max(0, Math.round(fs * (Number(this.data.minSpacingPercent)||0) / 100))
            const minStepX = wEff + padding
            const minStepY = hEff + padding
            const den = Math.max(1, Number(this.data.tileDensity)||5)
            const extra = Math.round((10 - den) * fs * 0.2)
            const stepX = minStepX + extra
            const stepY = minStepY + extra
            for(let y= -stepY; y<realH + stepY; y+=stepY){
              for(let x= -stepX; x<realW + stepX; x+=stepX){
                _ctx.save(); _ctx.translate(x,y); _ctx.rotate(angle); _ctx.textAlign = angle ? 'center' : 'left'; _ctx.textBaseline = angle ? 'middle' : 'top'; _ctx.fillText(text,0,0); _ctx.restore()
              }
            }
          }else{
            const metrics = _ctx.measureText(text)
            const w = Math.max(1, metrics.width)
            const h = fs
            const pos = this._calcPos(w,h)
            _ctx.save()
            if(this.data.angleDiagonal){ _ctx.translate(pos.x + w/2, pos.y + h/2); _ctx.rotate(-Math.PI/4); _ctx.textAlign = 'center'; _ctx.textBaseline = 'middle'; _ctx.fillText(text, 0, 0) }
            else { _ctx.textAlign = 'left'; _ctx.textBaseline = 'top'; _ctx.fillText(text, pos.x, pos.y) }
            _ctx.restore()
          }
        }
      _ctx.globalAlpha = 1
      const tempFilePath = await new Promise((resolve,reject)=>{
        wx.canvasToTempFilePath({ canvas: node, fileType:'jpg', quality:0.92, success:res=>resolve(res.tempFilePath), fail:reject })
      })
      await wx.saveImageToPhotosAlbum({ filePath: tempFilePath })
      wx.showToast({ title:'已保存到相册', icon:'success' })
    }}catch(e){ wx.showToast({ title:'导出失败', icon:'none' }) }
  }
})
