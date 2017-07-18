import {
  Animated,
  Easing,
  Image,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

const TRACK_SIZE = 4;
const THUMB_SIZE = 20;

function Rect(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
}

Rect.prototype.containsPoint = function containsPoint(x, y) {
  return (
    x >= this.x
      && y >= this.y
      && x <= this.x + this.width
      && y <= this.y + this.height
  );
};

const DEFAULT_ANIMATION_CONFIGS = {
  spring: {
    friction: 7,
    tension: 100,
  },
  timing: {
    delay: 0,
    duration: 150,
    easing: Easing.inOut(Easing.ease),
  },
};

export default class Slider extends PureComponent {
  static propTypes = {
    /**
     * Initial value of the slider. The value should be between minimumValue
     * and maximumValue, which default to 0 and 1 respectively.
     * Default value is 0.
     *
     * *This is not a controlled component*, e.g. if you don't update
     * the value, the component won't be reset to its inital value.
     */
    value: PropTypes.number,

    /**
     * If true the user won't be able to move the slider.
     * Default value is false.
     */
    disabled: PropTypes.bool,

    /**
     * Initial minimum value of the slider. Default value is 0.
     */
    minimumValue: PropTypes.number,

    /**
     * Initial maximum value of the slider. Default value is 1.
     */
    maximumValue: PropTypes.number,

    /**
     * Step value of the slider. The value should be between 0 and
     * (maximumValue - minimumValue). Default value is 0.
     */
    step: PropTypes.number,

    /**
     * The color used for the track to the left of the button. Overrides the
     * default blue gradient image.
     */
    minimumTrackTintColor: PropTypes.string,

    /**
     * The color used for the track to the right of the button. Overrides the
     * default blue gradient image.
     */
    maximumTrackTintColor: PropTypes.string,

    /**
     * The color used for the thumb.
     */
    thumbTintColor: PropTypes.string,

    /**
     * The size of the touch area that allows moving the thumb.
     * The touch area has the same center has the visible thumb.
     * This allows to have a visually small thumb while still allowing the user
     * to move it easily.
     * The default is {width: 40, height: 40}.
     */
    thumbTouchSize: PropTypes.shape({
      width: PropTypes.number,
      height: PropTypes.number,
    }),

    /**
     * Callback continuously called while the user is dragging the slider.
     */
    onValueChange: PropTypes.func,

    /**
     * Callback called when the user starts changing the value (e.g. when
     * the slider is pressed).
     */
    onSlidingStart: PropTypes.func,

    /**
     * Callback called when the user finishes changing the value (e.g. when
     * the slider is released).
     */
    onSlidingComplete: PropTypes.func,

    /**
     * The style applied to the slider container.
     */
    style: View.propTypes.style,

    /**
     * The style applied to the track.
     */
    trackStyle: View.propTypes.style,

    /**
     * The style applied to the thumb.
     */
    thumbStyle: View.propTypes.style,

    /**
     * Sets an image for the thumb.
     */
    thumbImage: Image.propTypes.source,

    /**
     * Set this to true to visually see the thumb touch rect in green.
     */
    debugTouchArea: PropTypes.bool,

    /**
     * Set to true to animate values with default 'timing' animation type
     */
    animateTransitions: PropTypes.bool,

    /**
     * Custom Animation type. 'spring' or 'timing'.
     */
    animationType: PropTypes.oneOf(['spring', 'timing']),

    /**
     * Used to configure the animation parameters.
     * These are the same parameters in the Animated library.
     */
    animationConfig: PropTypes.object, // eslint-disable-line react/forbid-prop-types


    /**
     * Set this to true to show segment intervals.
     */
    shouldShowIntervals: PropTypes.bool,

    /**
     * The style applied to each interval.
     */
    intervalStyle: View.propTypes.style,
  };

  static defaultProps = {
    step: 0,
    value: 0,
    style: {},
    trackStyle: {},
    thumbStyle: {},
    disabled: false,
    minimumValue: 0,
    maximumValue: 1,
    thumbImage: null,
    intervalStyle: {},
    debugTouchArea: false,
    animationType: 'timing',
    onValueChange: () => {},
    onSlidingStart: () => {},
    animateTransitions: false,
    thumbTintColor: '#343434',
    animationConfig: undefined,
    shouldShowIntervals: false,
    onSlidingComplete: () => {},
    minimumTrackTintColor: '#3f3f3f',
    maximumTrackTintColor: '#b3b3b3',
    thumbTouchSize: { width: 40, height: 40 },
  };

  state = {
    allMeasured: false,
    trackSize: { width: 0, height: 0 },
    thumbSize: { width: 0, height: 0 },
    containerSize: { width: 0, height: 0 },
    value: new Animated.Value(this.props.value),
  };

  componentWillMount() {
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: this._handleStartShouldSetPanResponder,
      onMoveShouldSetPanResponder: this._handleMoveShouldSetPanResponder,
      onPanResponderGrant: this._handlePanResponderGrant,
      onPanResponderMove: this._handlePanResponderMove,
      onPanResponderRelease: this._handlePanResponderEnd,
      onPanResponderTerminationRequest: this._handlePanResponderRequestEnd,
      onPanResponderTerminate: this._handlePanResponderEnd,
    });
  }

  componentWillReceiveProps(nextProps) {
    const newValue = nextProps.value;

    if (this.props.value !== newValue) {
      if (this.props.animateTransitions) {
        this._setCurrentValueAnimated(newValue);
      } else {
        this._setCurrentValue(newValue);
      }
    }
  }

  _renderThumbImage = () => {
    const { thumbImage } = this.props;
    if (!thumbImage) return;

    return <Image source={thumbImage} />;
  };

  _getPropsForComponentUpdate(props) {
    const {
      value, // eslint-disable-line no-unused-vars
      onValueChange, // eslint-disable-line no-unused-vars
      onSlidingStart, // eslint-disable-line no-unused-vars
      onSlidingComplete, // eslint-disable-line no-unused-vars
      style, // eslint-disable-line no-unused-vars
      trackStyle, // eslint-disable-line no-unused-vars
      thumbStyle, // eslint-disable-line no-unused-vars
      ...otherProps
    } = props;

    return otherProps;
  }

  // Should we become active when the user presses down on the thumb?
  _handleStartShouldSetPanResponder = (event) => this._thumbHitTest(event);

  // Should we become active when the user moves a touch over the thumb?
  _handleMoveShouldSetPanResponder = () => false;

  _handlePanResponderGrant = () => {
    this._previousLeft = this._getThumbLeft(this._getCurrentValue());
    this._fireChangeEvent('onSlidingStart');
  };

  _handlePanResponderMove = (_, gestureState) => {
    if (this.props.disabled) { return; }

    this._setCurrentValue(this._getValue(gestureState));
    this._fireChangeEvent('onValueChange');
  };

  _handlePanResponderRequestEnd = () => false;

  _handlePanResponderEnd = (_, gestureState) => {
    if (this.props.disabled) { return; }

    this._setCurrentValue(this._getValue(gestureState));
    this._fireChangeEvent('onSlidingComplete');
  };

  _measureContainer = (event) => {
    this._handleMeasure('containerSize', event);
  };

  _measureTrack = (event) => {
    this._handleMeasure('trackSize', event);
  };

  _measureThumb = (event) => {
    this._handleMeasure('thumbSize', event);
  };

  _handleMeasure = (name, event) => {
    const { width, height } = event.nativeEvent.layout;
    const size = { width, height };

    const storeName = `_${name}`;
    const currentSize = this[storeName];
    if (currentSize && width === currentSize.width && height === currentSize.height) {
      return;
    }
    this[storeName] = size;

    if (this._containerSize && this._trackSize && this._thumbSize) {
      this.setState({
        allMeasured: true,
        trackSize: this._trackSize,
        thumbSize: this._thumbSize,
        containerSize: this._containerSize,
      });
    }
  };

  _getThumbLeft = (value) => {
    const distance = (this.props.maximumValue - this.props.minimumValue);
    const ratio = (value - this.props.minimumValue) / distance;
    return ratio * (this.state.containerSize.width - this.state.thumbSize.width);
  };

  _getValue = (gestureState) => {
    const thumbLeft = this._previousLeft + gestureState.dx;
    const length = this.state.containerSize.width - this.state.thumbSize.width;

    const ratio = thumbLeft / length;
    const distance = this.props.maximumValue - this.props.minimumValue;
    const stepLength = (ratio * distance) / this.props.step;
    const nearestStep = this.props.minimumValue + (Math.round(stepLength) * this.props.step);

    if (this.props.step) {
      return Math.max(this.props.minimumValue, Math.min(this.props.maximumValue, nearestStep));
    }

    return Math.max(this.props.minimumValue,
      Math.min(this.props.maximumValue,
        (ratio * (this.props.maximumValue - this.props.minimumValue)) + this.props.minimumValue,
      ),
    );
  };

  _getCurrentValue = () => this.state.value.__getValue();

  _setCurrentValue = (value) => {
    this.state.value.setValue(value);
  };

  _setCurrentValueAnimated = (value) => {
    const animationType = this.props.animationType;
    const animationConfig = {
      ...DEFAULT_ANIMATION_CONFIGS[animationType],
      ...this.props.animationConfig,
      toValue: value,
    };

    Animated[animationType](this.state.value, animationConfig).start();
  };

  _fireChangeEvent = (event) => {
    if (this.props[event]) {
      this.props[event](this._getCurrentValue());
    }
  };

  _getTouchOverflowSize = () => {
    const state = this.state;
    const props = this.props;

    const size = {};
    if (state.allMeasured === true) {
      size.width = Math.max(0, props.thumbTouchSize.width - state.thumbSize.width);
      size.height = Math.max(0, props.thumbTouchSize.height - state.containerSize.height);
    }

    return size;
  };

  _getTouchOverflowStyle = () => {
    const { width, height } = this._getTouchOverflowSize();

    const touchOverflowStyle = {};
    if (width !== undefined && height !== undefined) {
      const verticalMargin = -height / 2;
      touchOverflowStyle.marginTop = verticalMargin;
      touchOverflowStyle.marginBottom = verticalMargin;

      const horizontalMargin = -width / 2;
      touchOverflowStyle.marginLeft = horizontalMargin;
      touchOverflowStyle.marginRight = horizontalMargin;
    }

    if (this.props.debugTouchArea === true) {
      touchOverflowStyle.backgroundColor = 'orange';
      touchOverflowStyle.opacity = 0.5;
    }

    return touchOverflowStyle;
  };

  _thumbHitTest = (e) => {
    const nativeEvent = e.nativeEvent;
    const thumbTouchRect = this._getThumbTouchRect();
    return thumbTouchRect.containsPoint(nativeEvent.locationX, nativeEvent.locationY);
  };

  _getThumbTouchRect = () => {
    const state = this.state;
    const props = this.props;
    const touchOverflowSize = this._getTouchOverflowSize();

    const thumbLeft = this._getThumbLeft(this._getCurrentValue());
    const thumbSizeWidth = (state.thumbSize.width - props.thumbTouchSize.width);
    const thumbYPositionInContainer = (state.containerSize.height - props.thumbTouchSize.height);

    return new Rect(
      (touchOverflowSize.width / 2) + thumbLeft + (thumbSizeWidth / 2),
      (touchOverflowSize.height / 2) + (thumbYPositionInContainer / 2),
      props.thumbTouchSize.width,
      props.thumbTouchSize.height,
    );
  };

  _renderDebugThumbTouchRect = (thumbLeft) => {
    const thumbTouchRect = this._getThumbTouchRect();
    const positionStyle = {
      left: thumbLeft,
      top: thumbTouchRect.y,
      width: thumbTouchRect.width,
      height: thumbTouchRect.height,
    };

    return (
      <Animated.View
        pointerEvents={'none'}
        style={[defaultStyles.debugThumbTouchArea, positionStyle]}
      />
    );
  };

  _renderSegmentIntervals = () => {
    const { value, trackSize } = this.state;
    const { intervalStyle, minimumTrackTintColor, maximumTrackTintColor } = this.props;
    const distance = (this.props.maximumValue - this.props.minimumValue) + 1;
    const numberOfSegments = Math.floor(distance / this.props.step);
    const segmentArray = Array.from(new Array(numberOfSegments), (_, index) => index);
    return (
      <View style={[defaultStyles.dotsContainer, { width: trackSize.width }]}>
        {segmentArray.map((_, index) => {
          const backgroundColor = value.interpolate({
            inputRange: [index, index],
            outputRange: [maximumTrackTintColor, minimumTrackTintColor],
          });
          const style = { width: 8, height: 8, backgroundColor, borderRadius: 4 };

          return (
            <Animated.View
              key={index} // eslint-disable-line react/no-array-index-key
              style={[style, intervalStyle]}
              renderToHardwareTextureAndroid
            />
          );
        })}
      </View>
    );
  }

  render() {
    const {
      style,
      trackStyle,
      thumbStyle,
      thumbImage, // eslint-disable-line no-unused-vars
      minimumValue,
      maximumValue,
      thumbTintColor,
      debugTouchArea,
      minimumTrackTintColor,
      maximumTrackTintColor,
      ...other
    } = this.props;
    const mainStyles = defaultStyles;
    const { value, containerSize, thumbSize, allMeasured } = this.state;
    const thumbLeft = value.interpolate({
      inputRange: [minimumValue, maximumValue],
      outputRange: [0, containerSize.width - thumbSize.width],
    });

    const valueVisibleStyle = {};
    if (!allMeasured) {
      valueVisibleStyle.opacity = 0;
    }

    const minimumTrackStyle = {
      position: 'absolute',
      width: Animated.add(thumbLeft, thumbSize.width / 2),
      backgroundColor: minimumTrackTintColor,
      ...valueVisibleStyle,
    };

    const touchOverflowStyle = this._getTouchOverflowStyle();

    return (
      <View {...other} style={[mainStyles.container, style]} onLayout={this._measureContainer}>
        <View
          onLayout={this._measureTrack}
          renderToHardwareTextureAndroid
          style={[{ backgroundColor: maximumTrackTintColor }, mainStyles.track, trackStyle]}
        />
        {this.props.shouldShowIntervals === true && this._renderSegmentIntervals()}
        <Animated.View
          renderToHardwareTextureAndroid
          style={[mainStyles.track, trackStyle, minimumTrackStyle]}
        />
        <Animated.View
          onLayout={this._measureThumb}
          renderToHardwareTextureAndroid
          style={[
            { backgroundColor: thumbTintColor },
            mainStyles.thumb,
            thumbStyle,
            {
              transform: [
                { translateX: thumbLeft },
                { translateY: 0 },
              ],
              ...valueVisibleStyle,
            },
          ]}
        >
          {this._renderThumbImage()}
        </Animated.View>
        <View
          renderToHardwareTextureAndroid
          style={[defaultStyles.touchArea, touchOverflowStyle]}
          {...this._panResponder.panHandlers}
        >
          {debugTouchArea === true && this._renderDebugThumbTouchRect(thumbLeft)}
        </View>
      </View>
    );
  }
}

const defaultStyles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_SIZE,
    borderRadius: TRACK_SIZE / 2,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    position: 'absolute',
    borderRadius: THUMB_SIZE / 2,
  },
  touchArea: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  debugThumbTouchArea: {
    opacity: 0.5,
    position: 'absolute',
    backgroundColor: 'green',
  },
  dotsContainer: {
    height: 20,
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
