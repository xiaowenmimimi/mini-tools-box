Component({
  properties: {
    tools: {
      type: Array,
      value: []
    },
    columns: {
      type: Number,
      value: 3
    }
  },
  methods: {
    onToolClick(e) {
      const index = e.currentTarget.dataset.index;
      const tool = this.data.tools[index];
      this.triggerEvent('toolclick', { tool, index });
    }
  }
})
