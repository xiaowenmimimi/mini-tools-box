// 图片工具：按宽缩放尺寸
function scaleToWidth(info, targetW){
  const r = targetW / info.width;
  return { w: targetW, h: Math.round(info.height * r) };
}
module.exports = { scaleToWidth };
