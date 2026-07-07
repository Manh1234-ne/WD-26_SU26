import './Loading.css'

interface LoadingProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    fullScreen?: boolean;
}

const sizeMap = {
    sm: 24,
    md: 40,
    lg: 64,
};

export default function Loading({ size = 'md', text, fullScreen = false }: LoadingProps) {
    const px = sizeMap[size]

    const spinner = (
        <div className="loading-wrapper">
            <div
                className="loading-spinner"
                style={{ width: px, height: px }}
            />
            {text && <p className="loading-text">{text}</p>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="loading-fullscreen">
                {spinner}
            </div>
        );
    }

    return (
        <div className="loading-center">
            {spinner}
        </div>
    );
}