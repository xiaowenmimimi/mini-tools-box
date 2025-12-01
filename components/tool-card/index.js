Component({
  properties: {
    icon: {
      type: String,
      value: '🔧'
    },
    name: {
      type: String,
      value: '工具'
    },
    desc: {
      type: String,
      value: ''
    }
  },
  methods: {
    onTap() {
      this.triggerEvent('click');
    }
  }
})
