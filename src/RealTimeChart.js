import Bar from './Bar';
import Line from './Line';
import Stage from './Stage';
import Hover from './Hover';
import Resize from './Resize';

class RealTimeChart {
  constructor(element) {
    /**
     * DOM Element
     */
    this.element = element;
    /**
     * Context
     */
    this.ctx = this.element.getContext('2d');
    /**
     * Data for drawing the chart from
     * @type {Array}
     */
    this.data = [];
    /**
     * Every option by user comes here
     */
    this.options = {};

    /**
     * Settings that are private to the user,
     * generated by default or by user options
     */
    this.settings = {
      paddingBottom: 0,
      paddingRight: 0,
      borderWidth: 2,
      boxInnerPadding: 2,
      stageWidth: 0,
      stageHeight: 0,
      oneXSegment: 0,
      oneYSegment: 0,
      valueDiff: 0,
    };
  }

  /**
   * Set the user options,
   * merge it with the defaults.
   * Call init, when done.
   * @param options
   */
  setOptions(options) {
    //Public options
    this.options = {
      onHover: data => {},
      waitWindowLoad: false,
      isResponsive: false,
      type: 'line',
      width: 600,
      height: 600,
      totalElement: 50,
      minValue: 250,
      maxValue: 500,
      calcMaxValue: false,
      showRuler: true,
      showFrame: true,
      textColor: '#313131',
      frameColor: '#DDDDDD',
      legend: [
        {
          color: '#846f08',
        },
        {
          color: '#2cabe3',
        },
        {
          color: '#000',
        },
        {
          color: '#53e69d',
        },
      ],
      paddingRight: 0,
      paddingBottom: 0,
    };

    this.options = {
      ...this.options,
      ...options,
    };

    this.onLoad().then(() => {
      this.init();
    });
  }

  /**
   * If the window is loaded the promise resolves depending on waitWindowLoad option 
   * @returns {Promise}
   */
  onLoad() {
    return new Promise(resolve => {
      if (this.options.waitWindowLoad) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          resolve();
        } else {
          window.addEventListener('load', () => {
            resolve();
          });
        }
      } else {
        resolve();
      }
    });
  }

  /**
   * Calculate the default sizes
   * Create the plugins
   */
  init() {
    this.calculateDefaults();
    this.createPlugins();
    this.createResizePlugin();
  }

  createPlugins() {
    this.Bar = new Bar(this);
    this.Line = new Line(this);
    this.Stage = new Stage(this);
    this.Hover = new Hover(this);
  }

  /**
   * Putting this separately, because it's standalone
   */
  createResizePlugin() {
    this.Resize = new Resize(this);
  }

  /**
   * Any data should be added by calling this fn
   * @param value (array of objects, object, number)
   */
  addChartData(value) {
    this.data.push(this.transformChartDataToPercent(value));
    if (this.data.length > this.options.totalElement) {
      this.data.shift();
    }
  }

  /**
   * Render the chart according to the data
   */
  render() {
    /**
     * Clear the stage
     */
    this.Stage.clearStage();
    switch (this.options.type) {
      case 'line':
        this.renderLine();
        break;
      case 'bar':
        this.renderBar();
        break;
    }
  }

  renderBar() {
    this.data.forEach((value, segmentKey) => {
      this.drawBar(value, segmentKey);
    });
  }

  drawBar(values, segmentKey) {
    values.sort(this.sortDesc).forEach((value, iterKey) => {
      this.Bar.setOptions({
        segmentKey: segmentKey,
        iterKey: iterKey,
        percent: value.value,
        id: value.id,
      });
      this.Bar.draw();
    });
  }

  sortDesc(a, b) {
    if (typeof a === 'number') {
      return a < b;
    } else if (typeof a === 'object') {
      return a.value < b.value;
    }
  }

  destroy() {
    this.Resize.destroy();
    this.Hover.destroy();
  }

  drawLine(values, segmentKey) {
    values.forEach((value, iterKey) => {
      this.Line.setOptions({
        segmentKey: segmentKey,
        iterKey: iterKey,
        percent: value.value,
        id: value.id,
      });
      this.Line.draw();
    });
  }

  renderLine() {
    this.data.forEach((value, segmentKey) => {
      this.drawLine(value, segmentKey);
    });

    this.Line.resetXY();
  }

  calculateDefaults() {
    if (this.options.hasOwnProperty('legend') === true && this.options.legend.length > 0) {
      this.settings.paddingBottom = this.options.paddingBottom + 30;
    }
    if (this.options.showRuler === true) {
      this.settings.paddingRight = this.options.paddingRight + 30;
    }

    this.settings.borderWidth = 2;
    this.settings.boxInnerPadding = 2;
    this.settings.stageWidth =
      this.options.width - this.settings.borderWidth - this.settings.paddingRight - this.settings.boxInnerPadding;
    this.settings.stageHeight =
      this.options.height - this.settings.borderWidth - this.settings.paddingBottom - this.settings.boxInnerPadding;
    this.settings.oneXSegment = this.settings.stageWidth / this.options.totalElement;
    this.settings.oneYSegment = this.settings.stageHeight / 100;
    this.calculateValueDiff();
  }

  filterValue(value) {
    if (value < this.options.minValue) {
      return this.options.minValue;
    }

    if (value > this.options.maxValue) {
      if (this.options.calcMaxValue) {
        this.options.maxValue = value + value * 0.1;
        this.calculateValueDiff();
        this.recalculatePercents();
        this.Stage.printRuler();
        return value;
      } else {
        return this.options.maxValue;
      }
    }

    return value;
  }

  calculateValueDiff() {
    this.settings.valueDiff = this.options.maxValue - this.options.minValue;
  }

  calculatePercent(num) {
    let correctValue = this.filterValue(num);
    return Math.round((correctValue - this.options.minValue) / this.settings.valueDiff * 100) || 1;
  }

  recalculatePercents() {
    this.data = this.data.map(statData => {
      return statData.map(data => {
        data.value = this.calculatePercent(data.defValue);
        return data;
      });
    });
  }

  transformChartDataToPercent(values) {
    if (typeof values === 'number') {
      return this.transformChartDataToPercent([{ value: values }]);
    } else if (typeof values === 'object' && values.value) {
      return this.transformChartDataToPercent([values]);
    } else if (Array.isArray(values)) {
      return values.map(numObject => {
        if (typeof numObject === 'object') {
          numObject.defValue = numObject.value;
          numObject.value = this.calculatePercent(numObject.value);
          return numObject;
        } else if (typeof numObject === 'number') {
          return { value: this.calculatePercent(numObject), defValue: numObject };
        }
      });
    }
  }
}

export default RealTimeChart;
