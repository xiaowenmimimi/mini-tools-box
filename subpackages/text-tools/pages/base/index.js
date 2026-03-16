Page({
    data: {
        // 支持的进制列表
        baseOptions: [
            { label: '二进制 (Binary)', value: 2 },
            { label: '八进制 (Octal)', value: 8 },
            { label: '十进制 (Decimal)', value: 10 },
            { label: '十六进制 (Hex)', value: 16 }
        ],
        inputBaseIndex: 2, // 默认十进制 (index 2)
        inputText: '',
        results: [], // 存储所有进制的结果 { label, value, base }
        errorMsg: '',
        isFormatted: true // 默认开启格式化
    },

    onLoad() {
        this.convert() // 初始化空状态
    },

    // 切换输入进制
    onInputBaseChange(e) {
        this.setData({
            inputBaseIndex: e.detail.value,
            errorMsg: ''
        })
        this.convert()
    },

    // 切换格式化开关
    toggleFormat() {
        this.setData({ isFormatted: !this.data.isFormatted })
        this.convert()
    },

    // 输入监听
    onInput(e) {
        // 允许输入空格，但在处理时会去除
        this.setData({
            inputText: e.detail.value,
            errorMsg: ''
        })
        this.convert()
    },

    // 清空
    clear() {
        this.setData({
            inputText: '',
            results: [],
            errorMsg: ''
        })
    },

    // 复制结果
    copyResult(e) {
        const text = e.currentTarget.dataset.text
        // 复制时去除格式化空格，还是保留？通常复制是为了使用，建议去除空格。
        // 但如果用户想要格式化后的，也可以。
        // 这里策略：复制纯净内容（无空格）。
        const cleanText = text.replace(/\s/g, '')

        wx.setClipboardData({
            data: cleanText,
            success: () => wx.showToast({ title: '已复制' })
        })
    },

    // 核心转换逻辑
    convert() {
        // 去除所有空白字符进行处理
        const rawInput = this.data.inputText.replace(/\s/g, '')

        if (!rawInput) {
            this.setData({ results: [] })
            return
        }

        const fromBase = this.data.baseOptions[this.data.inputBaseIndex].value

        try {
            // 验证输入合法性
            if (!this.validateInput(rawInput, fromBase)) {
                this.setData({ errorMsg: '输入包含非法字符' })
                return
            }

            let val = BigInt(0)
            if (fromBase === 10) {
                val = BigInt(rawInput)
            } else {
                val = this.parseBigInt(rawInput, fromBase)
            }

            // 生成所有进制结果
            const results = this.data.baseOptions.map(opt => {
                let str = val.toString(opt.value).toUpperCase()

                // 格式化输出
                if (this.data.isFormatted) {
                    str = this.formatOutput(str, opt.value)
                }

                return {
                    label: opt.label,
                    base: opt.value,
                    value: str
                }
            })

            this.setData({ results })

        } catch (e) {
            console.error(e)
            this.setData({ errorMsg: '转换错误: ' + e.message })
        }
    },

    formatOutput(str, base) {
        if (!str) return ''
        // 二进制：每4位加空格 (习惯上 4 或 8，这里用 4)
        if (base === 2) {
            return str.replace(/(.{4})(?=.)/g, '$1 ')
            // 注意：正则从左到右匹配。对于数字，通常希望从右到左分组？
            // 例如 11101 -> 0001 1101 ? 或者 1 1101 ?
            // 简单正则 replace 是从左到右。
            // 更好的体验是从低位到高位分组。
            // str = "11101" -> reverse -> "10111" -> "1011 1" -> reverse -> "1 1101"
        }
        // 十六进制：每4位加空格 (2 bytes?) 或者 2位(1 byte)?
        // 通常 Hex dump 是 2位。但在大数展示时，4位(16bit)一组也很常见。
        // 这里采用 4位一组，紧凑一点。
        if (base === 16) {
            return this.groupString(str, 4)
        }
        if (base === 2) {
            return this.groupString(str, 4)
        }
        if (base === 8) {
            return this.groupString(str, 3) // 3 bits = 1 Octal digit? 不，是字符分组。
            // Octal 并没有很强的分组习惯，或者 3位一组。
            return this.groupString(str, 3)
        }
        // 十进制：千分位
        if (base === 10) {
            // BigInt .toLocaleString() 可以，但不同环境兼容性。
            // 手动实现
            return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        }
        return str
    },

    groupString(str, step) {
        // 从右向左分组
        let res = ''
        let count = 0
        for (let i = str.length - 1; i >= 0; i--) {
            res = str[i] + res
            count++
            if (count % step === 0 && i !== 0) {
                res = ' ' + res
            }
        }
        return res
    },

    validateInput(str, base) {
        const regexMap = {
            2: /^[01]+$/,
            8: /^[0-7]+$/,
            10: /^[0-9]+$/,
            16: /^[0-9A-Fa-f]+$/
        }
        return regexMap[base].test(str)
    },

    parseBigInt(str, base) {
        // 简单实现 BigInt Parse
        // 实际上 BigInt(str) 只支持 10 进制或前缀。
        // 我们可以用 BigInt 累加
        let res = BigInt(0)
        const baseBig = BigInt(base)
        const digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const upperStr = str.toUpperCase()

        for (let i = 0; i < upperStr.length; i++) {
            const char = upperStr[i]
            const val = digits.indexOf(char)
            if (val === -1 || val >= base) throw new Error('Invalid char')
            res = res * baseBig + BigInt(val)
        }
        return res
    }
})