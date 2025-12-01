const { sleep } = require('../../../../common/canvas-utils.js');

// 节流函数：限制函数在一定时间内只执行一次
function throttle(fn, wait) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= wait) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

const MAX = 15;
let canvas, ctx, realW=1080, realH=0;
function getWinInfo() {
  // 优先新 API，兼容老版本基础库
  if (wx.getWindowInfo) return wx.getWindowInfo();
  return wx.getSystemInfoSync(); // 兜底
}
Page({
  data:{ 
    list:[], 
    // 将颜色选项改为对象数组，更易于管理
    bgOptions: [
      { name: '白色', value: '#ffffff' },
      { name: '浅灰', value: '#f7f7f7' },
      { name: '黑色', value: '#000000' }
    ], 
    bg:'#ffffff', // 当前选中的背景色
    isCustomBgActive: false, // 是否激活了自定义颜色
    customBgInput: '10B981', // 自定义颜色输入值 (不带#)
    // 新增：调色板颜色
    colorPalette: [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
      '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
      '#f43f5e', '#78716c', '#64748b', '#334155'
    ],
    composed:false, 
    previewH:300,
    previewImageUrl: '', // 添加预览图片路径
    previewLoading: false, // 预览图片加载状态
    previewError: false, // 预览图片加载错误
    // 拖拽状态管理
    dragState: {
      isDragging: false,
      dragItemInfo: null, // 被拖拽的元素信息
      itemRects: [], // 所有可拖拽元素的位置信息
      lastMoveTime: 0, // 上次移动时间戳
      lastSwapTime: 0, // 上次交换位置的时间戳
      isTempHidden: false // 临时隐藏拖拽项，解决闪烁问题
    }
  },
  async pick(){
    try {
      // 使用wx.chooseMedia替代wx.chooseImage (后者已过时)
      const res = await wx.chooseMedia({ 
        count: MAX - this.data.list.length, // 限制总数
        mediaType: ['image'],
        sizeType: ['original','compressed'],
        sourceType: ['album', 'camera']
      });
      
      if (!res || !res.tempFiles || !res.tempFiles.length) {
        return; // 用户取消选择
      }
      
      // 为每个新图片生成唯一 key
      const newImages = res.tempFiles.map(f => ({ 
        path: f.tempFilePath || '',
        size: f.size || 0,
        uniqueKey: `img_${Date.now()}_${Math.random()}`
      }));

      this.setData({ 
        list: [...this.data.list, ...newImages]
      });
      
      wx.showToast({title: `已选择${newImages.length}张图片`, icon: 'success'});
    } catch (err) {
      if (err.errMsg.includes('cancel')) return;
      console.error('选择图片错误:', err);
      wx.showToast({title: '选择图片失败', icon: 'none'});
    }
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const list = [...this.data.list];
    list.splice(index, 1);
    this.setData({ list });
    wx.showToast({ title: '已移除', icon: 'none', duration: 1000 });
  },

  onDragStart(e) {
    const index = e.currentTarget.dataset.index;
    const touch = e.touches && e.touches[0];

    if (!touch) {
      console.warn('无法获取拖拽起始点');
      return;
    }
    
    // 防止页面滚动
    if (e.preventDefault) {
      e.preventDefault();
    }
    
    // 提供触觉反馈
    wx.vibrateShort({ type: 'medium' });
    
    // 获取所有预览项的位置信息
    const query = wx.createSelectorQuery().in(this);
    query.selectAll('.image-preview-item').boundingClientRect(rects => {
      const rect = rects[index];
      if (!rect) return;

      // 缓存所有项的位置信息，便于后续拖拽交互
      const itemRects = rects.map(r => ({
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        centerX: r.left + r.width / 2,
        centerY: r.top + r.height / 2
      }));
      
      // 获取窗口信息，用于边界检查
      const winInfo = getWinInfo();
      
      // 首先将所有状态重置为初始状态
      this.setData({
        'dragState.isTempHidden': false,
        'dragState.lastSwapTime': 0,
        'dragState.lastMoveTime': 0
      });
      
      // 再设置拖拽状态
      setTimeout(() => {
        // 计算拖拽元素的初始位置，确保不会超出屏幕边界
        let initialX = touch.clientX - rect.width / 2;
        let initialY = touch.clientY - rect.height / 2;
        
        // 边界检查
        if (initialX < 0) initialX = 0;
        if (initialY < 0) initialY = 0;
        if (initialX + rect.width > winInfo.windowWidth) {
          initialX = winInfo.windowWidth - rect.width;
        }
        if (initialY + rect.height > winInfo.windowHeight) {
          initialY = winInfo.windowHeight - rect.height;
        }
        
        const dragItemInfo = {
          width: rect.width,
          height: rect.height,
          // 使用经过边界检查的初始位置
          x: initialX,
          y: initialY,
          path: this.data.list[index].path,
          index: index,
          // 添加缩放和旋转效果的初始值
          scale: 1.05,
          rotate: 0
        };

        this.setData({
          'dragState.isDragging': true,
          'dragState.dragItemInfo': dragItemInfo,
          'dragState.itemRects': itemRects,
        });
      }, 10); // 小延时来优化视觉反馈
    }).exec();
  },

  onDragMove(e) {
    if (!this.data.dragState.isDragging) return;

    const touch = e.touches[0];
    const { itemRects, dragItemInfo, lastMoveTime, lastSwapTime } = this.data.dragState;

    // 防止页面滚动
    if (e.preventDefault) {
      e.preventDefault();
    }

    const now = Date.now();
    
    // 拖动位置更新使用节流处理，提高性能
    if (now - lastMoveTime > 16) { // 约60fps的更新频率
      // 添加平滑移动效果
      const newX = touch.clientX - dragItemInfo.width / 2;
      const newY = touch.clientY - dragItemInfo.height / 2;
      
      // 使用插值算法实现平滑移动
      const smoothX = dragItemInfo.x + (newX - dragItemInfo.x) * 0.7;
      const smoothY = dragItemInfo.y + (newY - dragItemInfo.y) * 0.7;

      this.setData({
        'dragState.dragItemInfo.x': smoothX,
        'dragState.dragItemInfo.y': smoothY,
        'dragState.lastMoveTime': now
      });
    }

    // 对交换位置操作增加时间间隔限制，降低频繁重绘
    if (now - lastSwapTime < 100) return; // 减少间隔时间，提高响应速度

    // 判断是否需要交换位置
    let targetIndex = -1;
    
    // 改进的碰撞检测算法：基于元素中心位置和重叠区域
    for (let i = 0; i < itemRects.length; i++) {
      if (i === dragItemInfo.index) continue;
      const rect = itemRects[i];
      
      // 计算拖拽元素的当前位置和尺寸
      const dragRect = {
        left: dragItemInfo.x,
        top: dragItemInfo.y,
        right: dragItemInfo.x + dragItemInfo.width,
        bottom: dragItemInfo.y + dragItemInfo.height,
        centerX: dragItemInfo.x + dragItemInfo.width / 2,
        centerY: dragItemInfo.y + dragItemInfo.height / 2
      };
      
      // 计算两个矩形的重叠区域
      const overlapLeft = Math.max(dragRect.left, rect.left);
      const overlapTop = Math.max(dragRect.top, rect.top);
      const overlapRight = Math.min(dragRect.right, rect.right);
      const overlapBottom = Math.min(dragRect.bottom, rect.bottom);
      
      // 如果存在重叠区域
      if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
        // 计算重叠面积占目标元素面积的比例
        const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
        const targetArea = rect.width * rect.height;
        const overlapRatio = overlapArea / targetArea;
        
        // 当重叠比例超过30%时，认为需要交换位置
        if (overlapRatio > 0.3) {
          targetIndex = i;
          break; // 找到一个满足条件的目标即可
        }
      }
    }

    if (targetIndex !== -1 && targetIndex !== dragItemInfo.index) {
      // 交换前添加触觉反馈
      wx.vibrateShort({ type: 'light' });

      // 暂时隐藏拖拽克隆，减少闪烁
      this.setData({
        'dragState.isTempHidden': true
      });

      // 等待DOM更新，减少视觉闪烁
      setTimeout(() => {
        const list = [...this.data.list];
        const draggedItem = list.splice(dragItemInfo.index, 1)[0];
        list.splice(targetIndex, 0, draggedItem);

        this.setData({
          list: list,
          'dragState.dragItemInfo.index': targetIndex,
          'dragState.lastSwapTime': Date.now()
        });

        // 延迟显示拖拽元素，使动画更流畅
        setTimeout(() => {
          this.setData({
            'dragState.isTempHidden': false
          });
        }, 30);
      }, 40);
    }
  },

  onDragEnd() {
    if (!this.data.dragState.isDragging) return;

    // 拖拽结束时添加触觉反馈
    wx.vibrateShort({ type: 'light' });

    // 获取最终位置，添加回弹动画效果
    const { dragItemInfo } = this.data.dragState;
    const targetIndex = dragItemInfo.index;

    // 先隐藏拖拽元素
    this.setData({
      'dragState.isDragging': false,
      'dragState.isTempHidden': true
    });

    // 等待动画完成后更新数据
    setTimeout(() => {
      // 重置拖拽状态
      this.setData({
        'dragState.dragItemInfo': null,
        'dragState.isTempHidden': false
      });

      // 重新获取项目位置信息，以便于下次拖拽
      const query = wx.createSelectorQuery().in(this);
      query.selectAll('.image-preview-item').boundingClientRect(rects => {
        if (rects && rects.length > 0) {
          const itemRects = rects.map(r => ({
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
            centerX: r.left + r.width / 2,
            centerY: r.top + r.height / 2
          }));

          this.setData({
            'dragState.itemRects': itemRects,
            'dragState.lastSwapTime': 0,
            'dragState.lastMoveTime': 0
          });
        }
      }).exec();
    }, 80); // 优化延迟时间，使动画更流畅
  },
  
  bgChange(e){ this.setData({ bg: this.data.bgOptions[e.detail.value].value }); },
  setBg(e){ 
    this.setData({ 
      bg: e.currentTarget.dataset.color,
      isCustomBgActive: false
    }); 
  },
  activateCustomBg() {
    this.setData({
      isCustomBgActive: true,
      // 激活自定义时，将当前输入框的值设为背景色
      bg: `#${this.data.customBgInput.replace(/[^0-9a-fA-F]/g, '')}`
    });
  },
  onCustomBgInput(e) {
    const color = e.detail.value.replace(/[^0-9a-fA-F]/g, '');
    this.setData({
      customBgInput: color,
      bg: `#${color}`
    });
  },
  selectPaletteColor(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({
      bg: color,
      // 同步更新输入框的值
      customBgInput: color.replace('#', '')
    });
  },
  
  // 预览图片加载成功
  onPreviewImageLoad(e) {
    console.log('预览图片加载成功:', e.detail.width, 'x', e.detail.height);
    
    // 验证图片是否有效(有合理宽高)
    if (e.detail.width < 10 || e.detail.height < 10) {
      console.error('预览图片尺寸异常:', e.detail);
      this.setData({ 
        previewLoading: false,
        previewError: true 
      });
      return;
    }
    
    // 取消加载状态
    this.setData({ 
      previewLoading: false,
      previewError: false
    });
  },
  
  // 预览图片加载失败
  onPreviewImageError(e) {
    console.error('预览图片加载错误:', e);
    
    // 设置错误状态，显示Canvas
    this.setData({
      previewLoading: false,
      previewError: true,
      previewImageUrl: ''
    });
    
    // 显示提示
    wx.showToast({
      title: '预览图片加载失败，请导出图片查看',
      icon: 'none',
      duration: 2000
    });
  },
  
  // 处理图片加载错误
  imageError(e) {
    const index = e.currentTarget.dataset.index;
    console.error(`图片${index}加载失败`);
    
    // 可选：在界面上显示错误图片标记
    const key = `list[${index}].error`;
    this.setData({
      [key]: true
    });
  },

  async compose() {
    try {
      // 重置拼接状态和全局变量
      this.setData({
        composed: false,
        previewImageUrl: '',
        previewLoading: true,  // 开始拼接时显示加载状态
        previewError: false
      });
      realH = 0;
      canvas = null;
      ctx = null;
      this._plan = null;
      
      wx.showLoading({ title: '处理中...' });
      const list = this.data.list || [];
      if (!list.length) { wx.hideLoading(); return; }
  
      const GAP = 16;
      // 1) 拿到 canvas 节点
      const query = wx.createSelectorQuery().in(this);
      const fields = await new Promise(ok => {
        query.select('#cvs').fields({ node: true, size: true }).exec(ok);
      });
      if (!fields || !fields[0] || !fields[0].node) {
        wx.hideLoading();
        return wx.showToast({ title: '无法初始化画布', icon: 'none' });
      }
      const node = fields[0].node;
  
      // 2) 归一化路径
      const normalizeSrc = it => (it && (it.path || it.tempFilePath || it.url || '')) + '';
      const rawList = list.map(it => normalizeSrc(it));
  
      // 3) 串行加载图片（node.createImage）
      const items = []; // { ok, src, w, h, gap }
      for (let i = 0; i < rawList.length; i++) {
        const src = rawList[i];
        if (!src) { items.push({ ok: false, w: realW, h: 100, gap: GAP }); continue; }
  
        const img = node.createImage();
        const loaded = await new Promise(resolve => {
          let done = false;
          const tid = setTimeout(() => { if (done) return; done = true; img.src = ''; resolve({ ok: false, err: 'timeout' }); }, 8000);
          img.onload = () => { if (done) return; done = true; clearTimeout(tid); resolve({ ok: true }); };
          img.onerror = () => { if (done) return; done = true; clearTimeout(tid); resolve({ ok: false }); };
          img.src = src;
        });
  
        if (loaded.ok && img.width && img.height) {
          const r = realW / Math.max(img.width, 1);
          const sh = Math.round(img.height * r);
          items.push({ ok: true, src, img, w: realW, h: sh, gap: GAP });
        } else {
          items.push({ ok: false, src, w: realW, h: 100, gap: GAP });
        }
        await Promise.resolve(); // 让出主线程
      }
  
      const okCount = items.filter(x => x.ok).length;
      if (!okCount) {
        wx.hideLoading();
        return wx.showToast({ title: '没有有效的图片可以拼接', icon: 'none' });
      }
  
      // 4) 计算总高度（高清基准：realW=1080）
      realH = items.reduce((s, it) => s + (it.h || 100), 0) + GAP * (items.length - 1);
  
      // 5) 计算预览尺寸：按容器宽×DPR 绘制
      const box = await new Promise(ok => {
        wx.createSelectorQuery().in(this)
          .select('#canvasBox').boundingClientRect().exec(res => ok(res && res[0]));
      });
      const win = getWinInfo();
      const cssW = (box && box.width) ? box.width : win.windowWidth;
      const previewH = Math.ceil(cssW * realH / realW);
      const dpr = win.pixelRatio || 2;
      const pvW = Math.round(cssW * dpr);
      const pvH = Math.round(previewH * dpr);
  
      // 6) 设置预览画布分辨率，并用 setTransform 做等比缩放
      node.width  = pvW;
      node.height = pvH;
  
      const _ctx = node.getContext('2d');
      canvas = node;
      ctx = _ctx; // ★ 回填全局
  
      // 将后续绘制坐标保持在“高清坐标系（realW×realH）”，用矩阵缩放到预览分辨率
      const scale = pvW / realW;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
  
      // 7) 背景
      ctx.fillStyle = this.data.bg || '#ffffff';
      ctx.fillRect(0, 0, realW, realH);
  
      // 8) 逐张绘制（用高清坐标）
      let y = 0;
      for (const it of items) {
        if (it.ok && it.img) {
          ctx.drawImage(it.img, 0, y, it.w, it.h);
          it.img.src = ''; // 释放
        } else {
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, y, it.w || realW, 100);
          ctx.fillStyle = '#999';
          ctx.font = '24px sans-serif';
          ctx.fillText('图片加载失败', 20, y + 55);
        }
        y += (it.h || 100) + it.gap;
      }
  
      // 9) 记录拼接计划用于导出重放（去掉 img 引用，避免内存占用）
      this._plan = items.map(it => ({
        ok: it.ok, src: it.src, w: realW, h: it.h || 100, gap: it.gap
      }));
  
            // 10) 刷新预览高度 & 状态
      this.setData({ previewH, composed: true });

      // 11) 拼接完成，不生成预览图片
      this.setData({
        previewImageUrl: '', // 清空预览图片
        previewLoading: false, // 拼接完成后隐藏加载状态
        previewError: false
      });
      
      wx.hideLoading();
      wx.showToast({ title: `拼接完成 (${realW}×${realH})`, icon: 'none' });
    } catch (e) {
      console.error('拼接过程错误:', e);
      wx.hideLoading();
      wx.showToast({ title: '拼接失败', icon: 'none' });
    }
  },

  async exportImg() {
    if (!this.data.composed) {
      wx.showToast({ title: '请先完成拼接', icon: 'none' });
      return;
    }
    if (!this._plan || !this._plan.length) {
      wx.showToast({ title: '暂无拼接计划', icon: 'none' });
      return;
    }
  
    try {
      wx.showLoading({ title: '导出中...' });
  
      // 设置预览加载状态
      this.setData({
        previewLoading: true, 
        previewError: false,
        previewImageUrl: ''
      });
      
      // 重新获得 canvas 节点
      const query = wx.createSelectorQuery().in(this);
      const fields = await new Promise(ok => {
        query.select('#cvs').fields({ node: true, size: true }).exec(ok);
      });
      const node = fields[0].node;
      const _ctx = node.getContext('2d');
  
      // 高清分辨率
      node.width  = realW; // 1080
      node.height = realH;
      _ctx.setTransform(1, 0, 0, 1, 0, 0);
  
      // 背景
      _ctx.fillStyle = this.data.bg || '#ffffff';
      _ctx.fillRect(0, 0, realW, realH);
  
      // 重放图片
      let y = 0;
      for (const it of this._plan) {
        if (it.ok) {
          const img = node.createImage();
          await new Promise(r => { img.onload = r; img.onerror = r; img.src = it.src; });
          _ctx.drawImage(img, 0, y, realW, it.h);
        } else {
          _ctx.fillStyle = '#f0f0f0';
          _ctx.fillRect(0, y, realW, 100);
        }
        y += (it.h || 100) + (it.gap || 0);
      }
  
      // ★ 如果你记录了 masks[]（高清坐标），在这里重放 fillRect/mosaicRect

  
      // 导出图片
      const tempFilePath = await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas: node,
          fileType: 'jpg',
          quality: 0.92,
          success: (res) => {
            console.log('导出图片成功:', res.tempFilePath);
            resolve(res.tempFilePath);
          },
          fail: (err) => {
            console.error('导出图片失败:', err);
            reject(err);
          }
        });
      });
      
      // 设置预览图片URL
      this.setData({
        previewImageUrl: tempFilePath,
        previewLoading: false,
        previewError: false
      });
      
      // 保存到相册
      await wx.saveImageToPhotosAlbum({ filePath: tempFilePath });
      wx.hideLoading();
      wx.showToast({ title: '已保存到相册', icon: 'success' });

      // 重置拼接计划，允许用户再次拼接
      this._plan = null;
    } catch (err) {
      wx.hideLoading();
      console.error('导出错误:', err);
      
      // 设置预览错误状态
      this.setData({
        previewLoading: false,
        previewError: true
      });
      
      wx.showToast({ title: '导出失败:' + (err.errMsg || '未知错误'), icon: 'none' });
    }
  }  
});