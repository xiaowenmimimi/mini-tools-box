Page({
  data:{
    text:'',
    stats:{ length:0, nonSpace:0, words:0, lines:0, spaces:0, newlines:0, bytes:0 }
  },
  onTextInput(e){ const t = e.detail.value || ''; this.setData({ text:t, stats: this._calcStats(t) }); },
  clearText(){ this.setData({ text:'', stats: this._calcStats('') }); },
  copyStats(){ const s=this.data.stats; const out=`字符数: ${s.length}\n非空白字符: ${s.nonSpace}\n单词数: ${s.words}\n行数: ${s.lines}\n空白字符: ${s.spaces}\n换行数: ${s.newlines}\nUTF-8字节: ${s.bytes}`; wx.setClipboardData({ data: out }); },
  _calcStats(t){
    const len = t.length
    const nonSpace = (t.replace(/[\s]/g,'').length)
    const words = t.trim() ? (t.trim().split(/\s+/).length) : 0
    const newlines = (t.match(/\n/g)||[]).length
    const lines = len ? (newlines + 1) : 0
    const spaces = (t.match(/[\s]/g)||[]).length
    let bytes = 0
    for (const ch of t){
      const cp = ch.codePointAt(0)
      if (cp<=0x7F) bytes+=1
      else if (cp<=0x7FF) bytes+=2
      else if (cp<=0xFFFF) bytes+=3
      else bytes+=4
    }
    return { length:len, nonSpace, words, lines, spaces, newlines, bytes }
  }
})
