import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Pagination } from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  ClearOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FireOutlined,
  TagOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import { getMovies } from "../../features/movie/movie.service";
import type { Movie, MovieStatus } from "../../features/movie/movie.types";
import Loading from "../../components/Loading/Loading";

const PAGE_SIZE = 8;

const statusTabs: Array<{ label: string; value: MovieStatus | "all" }> = [
  { label: "Tất cả phim", value: "all" },
  { label: "Đang chiếu", value: "now_showing" },
  { label: "Sắp chiếu", value: "coming_soon" },
  { label: "Đã kết thúc", value: "ended" },
];

const statusLabel: Record<MovieStatus, { text: string; bg: string; color: string }> = {
  now_showing: { text: "Đang chiếu", bg: "#ecfdf5", color: "#059669" },
  coming_soon: { text: "Sắp chiếu", bg: "#fff7ed", color: "#ea580c" },
  ended: { text: "Đã kết thúc", bg: "#f1f5f9", color: "#64748b" },
};

const ageRatingBadge: Record<string, { label: string; bg: string; color: string }> = {
  P: { label: "P - Phổ biến", bg: "#dcfce7", color: "#15803d" },
  K: { label: "K - Dưới 13T xem cùng PH", bg: "#e0f2fe", color: "#0369a1" },
  T13: { label: "13+ Trên 13 tuổi", bg: "#fef3c7", color: "#b45309" },
  T16: { label: "16+ Trên 16 tuổi", bg: "#ffedd5", color: "#c2410c" },
  T18: { label: "18+ Trên 18 tuổi", bg: "#ffe4e6", color: "#be123c" },
  C: { label: "C - Cấm chiếu", bg: "#f3f4f6", color: "#4b5563" },
};

const PRESET_GENRES = [
  "Tất cả",
  "Hành động",
  "Phiêu lưu",
  "Hài hước",
  "Tình cảm",
  "Kinh dị",
  "Hoạt hình",
  "Khoa học viễn tưởng",
  "Tâm lý",
  "Gia đình",
  "Võ thuật",
  "Tài liệu",
];

type SortOption = "newest" | "oldest" | "duration_desc" | "title_asc";

export default function Movies() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract initial filters from URL params if present
  const initialStatus = (searchParams.get("status") as MovieStatus | "all") || "all";
  const initialGenre = searchParams.get("genre") || "Tất cả";
  const initialSearch = searchParams.get("search") || "";

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [status, setStatus] = useState<MovieStatus | "all">(initialStatus);
  const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre);
  const [search, setSearch] = useState<string>(initialSearch);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Fetch all movies from API (large limit to get catalog for filtering)
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getMovies({ limit: "100" })
      .then((data) => {
        if (isMounted) {
          setMovies(data || []);
          setError("");
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Không thể tải danh sách phim. Vui lòng kiểm tra lại kết nối.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (status !== "all") params.status = status;
    if (selectedGenre !== "Tất cả") params.genre = selectedGenre;
    if (search.trim()) params.search = search.trim();
    setSearchParams(params, { replace: true });
  }, [status, selectedGenre, search, setSearchParams]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [status, selectedGenre, search, sortBy]);

  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    movies.forEach((movie) => {
      if (Array.isArray(movie.genres)) {
        movie.genres.forEach((g) => {
          if (g && g.trim()) genreSet.add(g.trim());
        });
      }
    });

    const merged = Array.from(new Set([...PRESET_GENRES, ...Array.from(genreSet)]));
    return merged;
  }, [movies]);

  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = { "Tất cả": movies.length };
    movies.forEach((movie) => {
      if (Array.isArray(movie.genres)) {
        movie.genres.forEach((g) => {
          const trimmed = g.trim();
          counts[trimmed] = (counts[trimmed] || 0) + 1;
        });
      }
    });
    return counts;
  }, [movies]);

  const filteredMovies = useMemo(() => {
    return movies
      .filter((movie) => {
        if (status !== "all" && movie.status !== status) {
          return false;
        }

        if (selectedGenre !== "Tất cả") {
          if (
            !movie.genres ||
            !movie.genres.some(
              (g) => g.toLowerCase().trim() === selectedGenre.toLowerCase().trim()
            )
          ) {
            return false;
          }
        }

        // Search query filter
        if (search.trim()) {
          const query = search.toLowerCase().trim();
          const titleMatch = movie.title?.toLowerCase().includes(query);
          const origTitleMatch = movie.originalTitle?.toLowerCase().includes(query);
          const descMatch = movie.description?.toLowerCase().includes(query);
          const directorMatch = movie.director?.toLowerCase().includes(query);
          const genreMatch = movie.genres?.some((g) => g.toLowerCase().includes(query));

          if (!titleMatch && !origTitleMatch && !descMatch && !directorMatch && !genreMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
        }
        if (sortBy === "duration_desc") {
          return (b.duration || 0) - (a.duration || 0);
        }
        if (sortBy === "title_asc") {
          return a.title.localeCompare(b.title, "vi");
        }
        return 0;
      });
  }, [movies, status, selectedGenre, search, sortBy]);

  const paginatedMovies = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredMovies.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredMovies, currentPage]);

  const handleResetFilters = () => {
    setStatus("all");
    setSelectedGenre("Tất cả");
    setSearch("");
    setSortBy("newest");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    status !== "all" || selectedGenre !== "Tất cả" || search.trim() !== "";

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "10px 16px 60px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #e11d48 100%)",
          borderRadius: "16px",
          padding: "36px 32px",
          color: "#fff",
          marginBottom: "32px",
          boxShadow: "0 10px 30px rgba(225, 29, 72, 0.15)",
        }}
      >
        <div style={{ maxWidth: "700px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(8px)",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "12px",
              letterSpacing: "0.5px",
            }}
          >
            <FireOutlined style={{ color: "#fbbf24" }} />
            <span>KHO PHIM ĐIỆN ẢNH LUMORA</span>
          </div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 800,
              margin: "0 0 10px 0",
              lineHeight: 1.2,
              color: "#ffffff",
            }}
          >
            Khám Phá Phim Chiếu Rạp Mới Nhất
          </h1>
          <p style={{ fontSize: "15px", color: "#cbd5e1", margin: 0, lineHeight: 1.6 }}>
            Dễ dàng lọc các tác phẩm điện ảnh đỉnh cao theo thể loại, trạng thái chiếu và từ
            khóa để đặt vé nhanh chóng nhất.
          </p>
        </div>
      </div>

      {/* Control Bar: Search, Status Tabs, Sort */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          padding: "20px 24px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
          border: "1px solid #f1f5f9",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "260px", flex: "1 1 300px" }}>
            <SearchOutlined
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                fontSize: "16px",
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm phim theo tên, đạo diễn, từ khóa..."
              style={{
                width: "100%",
                padding: "10px 16px 10px 40px",
                fontSize: "14px",
                border: "1.5px solid #e2e8f0",
                borderRadius: "10px",
                outline: "none",
                transition: "all 0.2s ease",
                backgroundColor: "#f8fafc",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#e11d48";
                e.target.style.backgroundColor = "#ffffff";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.backgroundColor = "#f8fafc";
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              background: "#f1f5f9",
              padding: "4px",
              borderRadius: "10px",
            }}
          >
            {statusTabs.map((tab) => {
              const active = status === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatus(tab.value)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: active ? "#ffffff" : "transparent",
                    color: active ? "#e11d48" : "#64748b",
                    fontWeight: active ? 700 : 500,
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: active ? "0 2px 6px rgba(0, 0, 0, 0.08)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <SortAscendingOutlined style={{ color: "#64748b", fontSize: "16px" }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1.5px solid #e2e8f0",
                fontSize: "13px",
                fontWeight: 600,
                color: "#334155",
                backgroundColor: "#ffffff",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="newest">Ngày khởi chiếu (Mới nhất)</option>
              <option value="oldest">Ngày khởi chiếu (Cũ nhất)</option>
              <option value="duration_desc">Thời lượng (Dài nhất)</option>
              <option value="title_asc">Tên phim (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Genre Filter Section */}
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <TagOutlined style={{ color: "#e11d48", fontSize: "15px" }} />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
              Lọc theo thể loại phim:
            </span>
            {selectedGenre !== "Tất cả" && (
              <span
                style={{
                  fontSize: "12px",
                  color: "#e11d48",
                  background: "#ffe4e6",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: 600,
                }}
              >
                Đang chọn: {selectedGenre}
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {availableGenres.map((genre) => {
              const active = selectedGenre.toLowerCase() === genre.toLowerCase();
              const count = genreCounts[genre];

              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: active ? "1.5px solid #e11d48" : "1px solid #e2e8f0",
                    background: active ? "#e11d48" : "#ffffff",
                    color: active ? "#ffffff" : "#475569",
                    fontWeight: active ? 700 : 500,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s ease",
                    boxShadow: active ? "0 3px 10px rgba(225, 29, 72, 0.25)" : "none",
                  }}
                >
                  <span>{genre}</span>
                  {count !== undefined && (
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        background: active ? "rgba(255, 255, 255, 0.25)" : "#f1f5f9",
                        color: active ? "#ffffff" : "#64748b",
                        fontWeight: 700,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Header Info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#e11d48",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <ClearOutlined />
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </div>

      {/* Loading & Error States */}
      {isLoading && <Loading text="Đang tải danh sách phim..." />}
      {error && (
        <div
          style={{
            padding: "24px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            color: "#991b1b",
            textAlign: "center",
            margin: "20px 0",
          }}
        >
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredMovies.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px dashed #cbd5e1",
            margin: "20px 0",
          }}
        >
          <FilterOutlined style={{ fontSize: "48px", color: "#cbd5e1", marginBottom: "16px" }} />
          <h3 style={{ fontSize: "18px", color: "#334155", marginBottom: "8px" }}>
            Không tìm thấy bộ phim nào phù hợp
          </h3>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
            Hãy thử thay đổi thể loại, trạng thái hoặc từ khóa tìm kiếm của bạn.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: "#e11d48",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(225, 29, 72, 0.25)",
            }}
          >
            Xóa bộ lọc & Hiển thị tất cả
          </button>
        </div>
      )}

      {/* Movie Grid */}
      {!isLoading && !error && paginatedMovies.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "24px",
            }}
          >
            {paginatedMovies.map((movie) => {
              const statusConfig = statusLabel[movie.status] || {
                text: movie.status,
                bg: "#f1f5f9",
                color: "#475569",
              };
              const ageBadge = ageRatingBadge[movie.ageRating] || {
                label: movie.ageRating || "P",
                bg: "#e2e8f0",
                color: "#334155",
              };

              return (
                <div
                  key={movie._id}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    overflow: "hidden",
                    boxShadow: "0 4px 18px rgba(15, 23, 42, 0.06)",
                    border: "1px solid #f1f5f9",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = "0 14px 30px rgba(15, 23, 42, 0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 18px rgba(15, 23, 42, 0.06)";
                  }}
                >
                  {/* Poster Container */}
                  <Link
                    to={`/movies/${movie._id}`}
                    style={{
                      position: "relative",
                      aspectRatio: "2 / 3",
                      background: "#0f172a",
                      display: "block",
                      overflow: "hidden",
                      textDecoration: "none",
                    }}
                  >
                    {movie.posterUrl ? (
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform 0.5s ease",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#94a3b8",
                          fontWeight: 800,
                          fontSize: "36px",
                          background: "linear-gradient(135deg, #1e293b, #0f172a)",
                        }}
                      >
                        {movie.title.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Top Status Tag */}
                    <span
                      style={{
                        position: "absolute",
                        top: "12px",
                        left: "12px",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 700,
                        backgroundColor: statusConfig.bg,
                        color: statusConfig.color,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      }}
                    >
                      {statusConfig.text}
                    </span>

                    {/* Age Rating Tag */}
                    <span
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 800,
                        backgroundColor: ageBadge.bg,
                        color: ageBadge.color,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      }}
                    >
                      {movie.ageRating}
                    </span>
                  </Link>

                  {/* Card Content */}
                  <div
                    style={{
                      padding: "18px",
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                    }}
                  >
                    <Link
                      to={`/movies/${movie._id}`}
                      style={{
                        textDecoration: "none",
                        color: "#0f172a",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "17px",
                          fontWeight: 700,
                          margin: "0 0 6px 0",
                          lineHeight: 1.35,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {movie.title}
                      </h3>
                    </Link>

                    {movie.originalTitle && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#94a3b8",
                          margin: "0 0 10px 0",
                          fontStyle: "italic",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {movie.originalTitle}
                      </p>
                    )}

                    {/* Genres list */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                        marginBottom: "14px",
                      }}
                    >
                      {movie.genres && movie.genres.length > 0 ? (
                        movie.genres.map((g) => (
                          <span
                            key={g}
                            onClick={() => setSelectedGenre(g.trim())}
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "#f1f5f9",
                              color: "#475569",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "background 0.2s",
                            }}
                          >
                            {g.trim()}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>Chưa phân loại</span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "auto",
                        paddingTop: "12px",
                        borderTop: "1px solid #f1f5f9",
                        marginBottom: "16px",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <ClockCircleOutlined /> {movie.duration} phút
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <CalendarOutlined />{" "}
                        {new Date(movie.releaseDate).toLocaleDateString("vi-VN")}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Link
                        to={`/movies/${movie._id}`}
                        style={{
                          flex: 1,
                          textAlign: "center",
                          padding: "9px 0",
                          borderRadius: "8px",
                          border: "1.5px solid #e11d48",
                          color: "#e11d48",
                          fontWeight: 600,
                          fontSize: "13px",
                          textDecoration: "none",
                          transition: "all 0.2s",
                        }}
                      >
                        Chi Tiết
                      </Link>

                      <Link
                        to={`/movies/${movie._id}/showtimes`}
                        style={{
                          flex: 1,
                          textAlign: "center",
                          padding: "9px 0",
                          borderRadius: "8px",
                          background: "#e11d48",
                          color: "#ffffff",
                          fontWeight: 700,
                          fontSize: "13px",
                          textDecoration: "none",
                          boxShadow: "0 4px 10px rgba(225, 29, 72, 0.2)",
                          transition: "all 0.2s",
                        }}
                      >
                        Đặt Vé
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {filteredMovies.length > PAGE_SIZE && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginTop: "40px",
                padding: "16px 0",
              }}
            >
              <Pagination
                current={currentPage}
                pageSize={PAGE_SIZE}
                total={filteredMovies.length}
                showSizeChanger={false}
                onChange={(page) => {
                  setCurrentPage(page);
                  const anchor = document.getElementById("movies-content-anchor");
                  if (anchor) {
                    anchor.scrollIntoView({ behavior: "smooth", block: "start" });
                  } else {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
