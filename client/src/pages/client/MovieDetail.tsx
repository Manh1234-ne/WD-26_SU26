import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMovieById } from '../../features/movie/movie.service';
import type { Movie } from '../../features/movie/movie.types';
import Loading from '../../components/Loading/Loading';
import { 
  ClockCircleOutlined, 
  CalendarOutlined, 
  GlobalOutlined, 
  VideoCameraOutlined, 
  PlayCircleOutlined,
  ArrowLeftOutlined 
} from '@ant-design/icons';

const ageRatingBadge: Record<string, { label: string; bg: string; color: string }> = {
  P: { label: "P - Phổ biến", bg: "#dcfce7", color: "#15803d" },
  K: { label: "K - Dưới 13T xem cùng PH", bg: "#e0f2fe", color: "#0369a1" },
  T13: { label: "13+ Trên 13 tuổi", bg: "#fef3c7", color: "#b45309" },
  T16: { label: "16+ Trên 16 tuổi", bg: "#ffedd5", color: "#c2410c" },
  T18: { label: "18+ Trên 18 tuổi", bg: "#ffe4e6", color: "#be123c" },
  C: { label: "C - Cấm chiếu", bg: "#f3f4f6", color: "#4b5563" },
};

function MovieDetail() {
  const { id } = useParams();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    getMovieById(id)
      .then((data) => {
        setMovie(data);
        setError('');
      })
      .catch(() => setError('Không thể tải trang chi tiết phim...'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const getEmbedUrl = (url: string) => {
    if (url.includes("watch?v=")) {
      return url.replace("watch?v=", "embed/");
    }
    if (url.includes("youtu.be/")) {
      const vidId = url.split("youtu.be/")[1];
      return `https://www.youtube.com/embed/${vidId}`;
    }
    return url;
  };

  if (isLoading) {
    return <Loading fullScreen text="Đang tải thông tin phim..." />;
  }

  if (error || !movie) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', minHeight: '60vh', background: '#f8fafc' }}>
        <p style={{ color: '#e11d48', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
          {error || 'Không tìm thấy phim.'}
        </p>
        <Link 
          to="/"
          style={{
            padding: '10px 24px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}
        >
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  const badge = ageRatingBadge[movie.ageRating] || { label: movie.ageRating || 'P', bg: '#f1f5f9', color: '#475569' };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '80px', color: '#0f172a' }}>
      {/* Top Banner Area (Light, soft background) */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
          borderBottom: '1px solid #e2e8f0',
          padding: '60px 20px 40px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            gap: '40px',
            width: '100%',
            flexWrap: 'wrap',
          }}
        >
          {/* Left Column: Poster */}
          <div style={{ flex: '0 0 320px', margin: '0 auto' }}>
            <div 
              style={{ 
                borderRadius: '16px', 
                overflow: 'hidden', 
                boxShadow: '0 12px 32px rgba(15,23,42,0.12)',
                border: '4px solid #ffffff',
                aspectRatio: '2/3',
                background: '#e2e8f0'
              }}
            >
              {movie.posterUrl ? (
                <img 
                  src={movie.posterUrl} 
                  alt={movie.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '40px', color: '#94a3b8' }}>
                  {movie.title.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Info */}
          <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: '20px' }}>
              <Link 
                to="/" 
                style={{ 
                  color: '#64748b', 
                  textDecoration: 'none', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e11d48'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
              >
                <ArrowLeftOutlined /> Quay lại danh sách
              </Link>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span 
                style={{
                  background: movie.status === 'now_showing' ? '#e11d48' : '#cbd5e1',
                  color: '#fff',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}
              >
                {movie.status === 'now_showing' ? 'Đang chiếu' : movie.status === 'coming_soon' ? 'Sắp chiếu' : 'Đã kết thúc'}
              </span>
              <span
                style={{
                  background: badge.bg,
                  color: badge.color,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                {badge.label}
              </span>
            </div>

            <h1 style={{ fontSize: '42px', fontWeight: 800, marginBottom: '8px', lineHeight: 1.2, color: '#0f172a' }}>
              {movie.title}
            </h1>
            
            {movie.originalTitle && (
              <h2 style={{ fontSize: '18px', color: '#64748b', fontStyle: 'italic', fontWeight: 500, marginBottom: '24px' }}>
                {movie.originalTitle}
              </h2>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '32px' }}>
              {movie.genres?.map(g => (
                <span 
                  key={g} 
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                    padding: '6px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  {g}
                </span>
              ))}
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '24px', 
              marginBottom: '32px', 
              background: '#ffffff', 
              padding: '24px', 
              borderRadius: '16px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 4px 16px rgba(15,23,42,0.04)'
            }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ClockCircleOutlined /> Thời lượng
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{movie.duration} phút</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarOutlined /> Khởi chiếu
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString('vi-VN') : 'Đang cập nhật'}
                </div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <GlobalOutlined /> Ngôn ngữ
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{movie.language || 'Đang cập nhật'}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <VideoCameraOutlined /> Đạo diễn
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{movie.director || 'Đang cập nhật'}</div>
              </div>
            </div>

            <p style={{ fontSize: '16px', lineHeight: 1.8, color: '#475569', marginBottom: '40px' }}>
              {movie.description}
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Link 
                to={`/movies/${movie._id}/showtimes`}
                style={{
                  background: '#e11d48',
                  color: '#fff',
                  padding: '14px 40px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(225,29,72,0.25)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(225,29,72,0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(225,29,72,0.25)';
                }}
              >
                Đặt Vé Ngay
              </Link>
              
              {movie.trailerUrl && (
                <a 
                  href="#trailer"
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    color: '#334155',
                    padding: '14px 30px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(15,23,42,0.03)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <PlayCircleOutlined style={{ fontSize: '18px', color: '#e11d48' }} /> Xem Trailer
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content (Trailer Section) */}
      <div style={{ maxWidth: '1200px', margin: '60px auto 0', padding: '0 20px' }}>
        {movie.trailerUrl && (
          <section id="trailer" style={{ scrollMarginTop: '100px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '4px', height: '28px', background: '#e11d48', borderRadius: '4px' }}></div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Trailer Chính Thức</h2>
            </div>
            
            <div 
              style={{ 
                position: 'relative', 
                width: '100%', 
                paddingBottom: '56.25%', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                boxShadow: '0 20px 40px rgba(15,23,42,0.1)',
                background: '#e2e8f0',
                border: '1px solid #f1f5f9'
              }}
            >
              <iframe
                src={getEmbedUrl(movie.trailerUrl)}
                title={`Trailer ${movie.title}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%'
                }}
              ></iframe>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default MovieDetail;
