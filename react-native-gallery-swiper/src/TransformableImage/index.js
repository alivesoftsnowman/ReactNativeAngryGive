import React, { PureComponent } from "react";
import { View, Text, Image, ViewPropTypes } from "react-native";
import PropTypes from "prop-types";
import ViewTransformer from "../ViewTransformer";

export default class TransformableImage extends PureComponent {
    static propTypes = {
        image: PropTypes.shape({
            uri: PropTypes.string,
            dimensions: PropTypes.shape({
                width: PropTypes.number,
                height: PropTypes.number
            })
        }).isRequired,
        index: PropTypes.number.isRequired,
        style: ViewPropTypes
            ? ViewPropTypes.style
            : View.propTypes.style,
        onLoad: PropTypes.func,
        onLoadStart: PropTypes.func,
        enableTransform: PropTypes.bool,
        enableScale: PropTypes.bool,
        enableTranslate: PropTypes.bool,
        onTransformGestureReleased: PropTypes.func,
        onViewTransformed: PropTypes.func,
        imageComponent: PropTypes.func,
        resizeMode: PropTypes.string,
        errorComponent: PropTypes.func,
    };

    static defaultProps = {
        enableTransform: true,
        enableScale: true,
        enableTranslate: true,
        imageComponent: undefined,
        resizeMode: "contain"
    };

    constructor (props) {
        super(props);

        this.onLayout = this.onLayout.bind(this);
        this.onLoad = this.onLoad.bind(this);
        this.onLoadStart = this.onLoadStart.bind(this);
        this.getViewTransformerInstance =
            this.getViewTransformerInstance.bind(this);
        this.renderError = this.renderError.bind(this);

        this.state = {
            viewWidth: 0,
            viewHeight: 0,
            imageLoaded: false,
            imageDimensions: props.image.dimensions,
            keyAcumulator: 1,
            source: undefined
        };
    }

    componentWillMount () {
        if (!this.state.source) {
            this.getImageSource(this.props.image);
        }
        if (!this.state.imageDimensions) {
            this.getImageSize(this.props.image);
        }
    }

    componentDidMount () {
        this._mounted = true;
    }

    componentWillReceiveProps (nextProps) {
        if (!sameImage(this.props.image, nextProps.image)) {
            // image source changed, clear last
            // image's imageDimensions info if any
            this.setState({
                imageDimensions: nextProps.image.dimensions,
                keyAcumulator: this.state.keyAcumulator + 1
            });
            if (!nextProps.image.source) {
                this.getImageSource(nextProps.image);
            }
            // if we don't have image dimensions provided in source
            if (!nextProps.image.dimensions) {
                this.getImageSize(nextProps.image);
            }
        }
    }

    componentWillUnmount () {
        this._mounted = false;
    }

    onLoadStart (e) {
        this.props.onLoadStart && this.props.onLoadStart(e);
        if (this.state.imageLoaded) {
            this.setState({ imageLoaded: false });
        }
    }

    onLoad (e) {
        this.props.onLoad && this.props.onLoad(e);
        if (!this.state.imageLoaded) {
            this.setState({ imageLoaded: true });
        }
    }

    onLayout (e) {
        let {width, height} = e.nativeEvent.layout;
        if (this.state.viewWidth !== width || this.state.viewHeight !== height) {
            this.setState({ viewWidth: width, viewHeight: height });
        }
    }

    getImageSize (image) {
        if (!image) {
            return;
        }
        const uri = image.source && image.source.uri
            ? image.source.uri : image.uri
            ? image.uri : image.URI
            ? image.URI : image.url
            ? image.url : image.URL
            ? image.URL : undefined;

        if (image.dimensions && image.dimensions.width && image.dimensions.height) {
            this.setState({ imageDimensions: image.dimensions });
            return;
        }

        if (image.width && image.height) {
            this.setState({ imageDimensions: { width: image.width, height: image.height } });
            return;
        }

        if (uri) {
            Image.getSize(
                uri,
                (width, height) => {
                    if (width && height) {
                        if (
                            this.state.imageDimensions &&
                            this.state.imageDimensions.width === width &&
                            this.state.imageDimensions.height === height
                        ) {
                            // no need to update state
                        } else {
                            this._mounted && this.setState({
                                imageDimensions: { width, height }
                            });
                        }
                    }
                },
                () => {
                    this._mounted && this.setState({ error: true });
                }
            );
        } else {
            // eslint-disable-next-line no-console
            console.warn(
                "react-native-gallery-swiper",
                "Please provide dimensions for your local images."
            );
        }
    }

    getImageSource (image) {
        const source = image.source
            ? image.source : image.uri
            ? { uri: image.uri } : image.URI
            ? { uri: image.URI } : image.url
            ? { uri: image.url } : image.URL
            ? { uri: image.URL } : undefined;

        if (source) {
            this.setState({ source });
        } else {
            // eslint-disable-next-line no-console
            console.warn(
                "react-native-gallery-swiper",
                "Please provide a valid image field in " +
                "data images. Ex. source, uri, URI, url, URL"
            );
        }
    }

    getViewTransformerInstance () {
        return this.viewTransformer;
    }

    renderError () {
        return (this.props.errorComponent && this.props.errorComponent()) || (
            <View style={{
                flex: 1,
                backgroundColor: "black",
                alignItems: "center",
                justifyContent: "center"
            }}>
                <Text
                    style={{
                        color: "white",
                        fontSize: 15,
                        fontStyle: "italic"
                    }}>
                    This image cannot be displayed...
                </Text>
            </View>
        );
    }

    render () {
        const {
            source, imageDimensions, viewWidth, viewHeight,
            error, keyAccumulator, imageLoaded
        } = this.state;
        const {
            style, imageComponent, resizeMode, enableTransform,
            enableScale, enableTranslate, onTransformGestureReleased,
            onViewTransformed, index
        } = this.props;

        let maxScale = 1;
        let contentAspectRatio;
        let width, height; // imageDimensions

        if (imageDimensions) {
            width = imageDimensions.width;
            height = imageDimensions.height;
        }

        if (width && height) {
            contentAspectRatio = width / height;
            if (viewWidth && viewHeight) {
                maxScale = Math.max(width / viewWidth, height / viewHeight);
                maxScale = Math.max(1, maxScale);
            }
        }

        const imageProps = {
            ...this.props,
            imageLoaded,
            source: source,
            style: [style, { backgroundColor: "transparent" }],
            resizeMode: resizeMode,
            onLoadStart: this.onLoadStart,
            onLoad: this.onLoad,
            capInsets: { left: 0.1, top: 0.1, right: 0.1, bottom: 0.1 }
        };

        const content = imageComponent
            ? imageComponent(imageProps, imageDimensions, index)
            : <Image { ...imageProps } />;

        return (
            <ViewTransformer
                ref={(component) => (this.viewTransformer = component)}
                // when image source changes, we should use a different
                // node to avoid reusing previous transform state
                key={"viewTransformer#" + keyAccumulator}
                // disable transform until image is loaded
                enableTransform={enableTransform && imageLoaded}
                enableScale={enableScale}
                enableTranslate={enableTranslate}
                enableResistance={true}
                onTransformGestureReleased={onTransformGestureReleased}
                onViewTransformed={onViewTransformed}
                maxScale={maxScale}
                contentAspectRatio={contentAspectRatio}
                onLayout={this.onLayout}
                style={style}>
                    { error ? this.renderError() : content }
            </ViewTransformer>
        );
    }
}

function sameImage (source, nextSource) {
    if (source === nextSource) {
        return true;
    }
    if (source && nextSource) {
		const uri = findUri(source);
		const nextUri = findUri(nextSource);
        if (uri && nextUri) {
            return uri === nextUri;
        }
    }
    return false;
}

function findUri (data) {
	return data.source
		? data.source : data.uri
		? { uri: data.uri } : data.URI
		? { uri: data.URI } : data.url
		? { uri: data.url } : data.URL
		? { uri: data.URL } : undefined;
}
