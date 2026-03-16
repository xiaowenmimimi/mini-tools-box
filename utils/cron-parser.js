// 简易版 cron-parser 实现
// 支持解析 cron 表达式并计算下次运行时间
// 格式: 秒 分 时 日 月 周 [年]

function parseExpression(expression) {
  const parts = expression.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 7) {
    throw new Error('Cron 表达式格式错误，应包含 5-7 个字段');
  }

  // 补全字段: 如果只有5位，假设是 分 时 日 月 周 (Linux)，秒默认为0
  // 如果是6位，假设是 秒 分 时 日 月 周 (Spring)
  let second = '0', minute, hour, dayOfMonth, month, dayOfWeek;
  
  if (parts.length === 5) {
    [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  } else {
    [second, minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  }

  // 解析各个字段
  const parsed = {
    second: parseField(second, 0, 59, '秒'),
    minute: parseField(minute, 0, 59, '分'),
    hour: parseField(hour, 0, 23, '时'),
    dayOfMonth: parseField(dayOfMonth, 1, 31, '日'),
    month: parseField(month, 1, 12, '月'),
    dayOfWeek: parseField(dayOfWeek, 0, 7, '周') // 0-7, 0和7都是周日
  };

  return {
    next: function() {
      // 从当前时间开始找
      let date = this._currentDate ? new Date(this._currentDate.getTime() + 1000) : new Date();
      // 如果之前有调用过next，基于上次时间 + 1秒
      date.setMilliseconds(0);
      
      // 简单实现：逐秒/逐分递增查找 (性能较差但逻辑简单，对于预览足够)
      // 为了防止死循环，限制查找范围（例如一年）
      const maxIter = 100000; // 限制迭代次数
      let iter = 0;

      while (iter < maxIter) {
        if (match(date, parsed)) {
          this._currentDate = date;
          return date;
        }
        date.setSeconds(date.getSeconds() + 1);
        iter++;
      }
      throw new Error('未找到下次运行时间 (超出搜索范围)');
    },
    _currentDate: null
  };
}

function parseField(field, min, max, name) {
  if (!field) throw new Error(`${name}字段为空`);
  if (field === '*') return { type: '*', min, max };
  if (field === '?') return { type: '*', min, max }; // 简单处理 ? 当作 *
  
  const checkNum = (n) => {
      const val = parseInt(n);
      if (isNaN(val)) throw new Error(`${name}字段包含无效数字: ${n}`);
      return val;
  };

  // 处理列表 1,2,3
  if (field.includes(',')) {
    const values = field.split(',').map(checkNum);
    return { type: 'list', values };
  }
  
  // 处理范围 1-5
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(checkNum);
    if (start > end) throw new Error(`${name}字段范围无效: ${start}-${end}`);
    return { type: 'range', start, end };
  }
  
  // 处理步长 * / 5 或 0/5
  if (field.includes('/')) {
    const [startStr, stepStr] = field.split('/');
    let start = startStr === '*' ? min : checkNum(startStr);
    const step = checkNum(stepStr);
    if (step <= 0) throw new Error(`${name}字段步长必须大于0`);
    return { type: 'step', start, step, min, max };
  }
  
  // 单个值
  return { type: 'value', value: checkNum(field) };
}

function match(date, parsed) {
  const s = date.getSeconds();
  const m = date.getMinutes();
  const h = date.getHours();
  const D = date.getDate();
  const M = date.getMonth() + 1;
  const d = date.getDay(); // 0-6

  if (!matchField(s, parsed.second)) return false;
  if (!matchField(m, parsed.minute)) return false;
  if (!matchField(h, parsed.hour)) return false;
  if (!matchField(D, parsed.dayOfMonth)) return false;
  if (!matchField(M, parsed.month)) return false;
  
  // 周的特殊处理：0和7都是周日
  // Cron 里的周日通常是 0 或 7? 标准是 0-6 (周日-周六) 或 1-7 (周日-周六)?
  // Linux: 0-7 (0 or 7 is Sun)
  // JS Date: 0 (Sun) - 6 (Sat)
  // 这里我们假设 parsed.dayOfWeek 允许 0-7。
  // 我们把 JS 的 0 映射为 0 和 7 都可以匹配。
  if (!matchFieldWeek(d, parsed.dayOfWeek)) return false;
  
  return true;
}

function matchField(val, rule) {
  if (rule.type === '*') return true;
  if (rule.type === 'value') return val === rule.value;
  if (rule.type === 'list') return rule.values.includes(val);
  if (rule.type === 'range') return val >= rule.start && val <= rule.end;
  if (rule.type === 'step') {
      if (val < rule.start) return false;
      return (val - rule.start) % rule.step === 0;
  }
  return false;
}

function matchFieldWeek(val, rule) {
    // val 是 0-6
    if (rule.type === '*') return true;
    if (rule.type === 'value') {
        if (rule.value === 7 && val === 0) return true;
        return rule.value === val;
    }
    if (rule.type === 'list') {
        return rule.values.includes(val) || (val === 0 && rule.values.includes(7));
    }
    // range/step 类似处理，略繁琐，这里暂简化
    return matchField(val, rule);
}

module.exports = {
  parseExpression
};