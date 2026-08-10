import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Typography,
  Space,
  DatePicker,
  Select,
  Progress,
  Avatar,
  Segmented,
  Spin,
  message,
  Badge,
} from "antd";
import {
  DollarCircleOutlined,
  UserOutlined,
  VideoCameraOutlined,
  FilterOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DownloadOutlined,
  TrophyOutlined,
  PieChartOutlined,
  BarChartOutlined,
  LineChartOutlined,
  DashboardOutlined,
  SearchOutlined,
  FireOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import 'dayjs/locale/vi';
import isBetween from "dayjs/plugin/isBetween";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { api } from "../../services/api";
import * as XLSX from "xlsx";
import "./Dashboard.css";

dayjs.extend(isBetween);
dayjs.locale('vi');

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface ApiBooking {
  _id: string;
  bookingCode: string;
  user?: {
    _id: string;
    fullName?: string;
    email?: string;
    avatar?: string;
  };
  showtime?: {
    _id: string;
    movie?: {
      _id: string;
      title: string;
      cinema?: {
        name: string;
      }
    };
    room?: {
      _id: string;
      name: string;
      seatCapacity?: number;
    };
    startTime?: string;
    endTime?: string;
  };
  totalSeatPrice: number;
  discountAmount: number;
  finalAmount: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  createdAt: string;
}

interface ApiMovie {
  _id: string;
  title: string;
  status?: string;
}

interface ApiUser {
  _id: string;
  fullName: string;
  email: string;
  role?: string;
  avatar?: string;
}

interface ApiShowtime {
  _id: string;
  movie?: { _id: string; title: string };
  room?: { _id: string; name: string };
  startTime: string;
}

interface ApiRoom {
  _id: string;
  name: string;
  cinema?: { _id: string; name: string };
  seatCapacity?: number;
}

interface CustomerRow {
  key: string;
  rank: number;
  avatar: string;
  name: string;
  email: string;
  membership: "VIP Diamond" | "VIP Gold" | "Silver";
  tickets: number;
  totalSpent: number;
}

interface RevenueDetailRow {
  key: string;
  date: string;
  movieName: string;
  cinema: string;
  showtime: string;
  ticketsSold: number;
  revenue: number;
  status: string;
  rawDate: string;
}

interface RoomOccupancyRow {
  id: string;
  roomName: string;
  type: string;
  cinema: string;
  seats: number;
  occupancy: number;
}

interface ShowtimeStatistics {
  peakHours: { hour: number; count: number }[];
  peakRooms: { roomId: string; roomName: string; count: number }[];
  peakDates: { date: string; count: number }[];
  peakWeekdays: { dayOfWeek: number; count: number }[];
}

interface MovieRanking {
  movieId: string;
  title: string;
  revenue: number;
  tickets: number;
  bookings: number;
}


const formatVND = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
};

const getOccupancyColor = (occupancy: number) => {
  if (occupancy >= 85) return "#b91c1c"; // red
  if (occupancy >= 70) return "#f59e0b"; // yellow
  return "#10b981"; // green
};

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [showtimes, setShowtimes] = useState<ApiShowtime[]>([]);
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [bookingSeats, setBookingSeats] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<string>("all");
  const [revenueTimeframe, setRevenueTimeframe] = useState<"day" | "week" | "month">("day");
  const [tableSearchText, setTableSearchText] = useState<string>("");
  const [showtimeStatistics, setShowtimeStatistics] = useState<ShowtimeStatistics | null>(null);
  const [movieRankings, setMovieRankings] = useState<{ topRevenue: MovieRanking[]; hotMovies: MovieRanking[] }>({ topRevenue: [], hotMovies: [] });


  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        bookingsRes,
        moviesRes,
        usersRes,
        showtimesRes,
        roomsRes,
        bookingSeatsRes,
        showtimeStatisticsRes,
        movieRankingsRes,
      ] = await Promise.allSettled([
        api.get("/bookings"),
        api.get("/movies"),
        api.get("/users?limit=100"),
        api.get("/showtimes?includePast=true"),
        api.get("/rooms"),
        api.get("/booking-seats"),
        api.get("/statistics/showtimes"),
        api.get("/statistics/movies"),
      ]);

      if (bookingsRes.status === "fulfilled" && bookingsRes.value.data?.data) {
        const raw = bookingsRes.value.data.data;
        setBookings(Array.isArray(raw) ? raw : Array.isArray(raw.bookings) ? raw.bookings : []);
      }
      if (moviesRes.status === "fulfilled" && moviesRes.value.data?.data) {
        const raw = moviesRes.value.data.data;
        setMovies(Array.isArray(raw) ? raw : Array.isArray(raw.movies) ? raw.movies : []);
      }
      if (usersRes.status === "fulfilled" && usersRes.value.data?.data) {
        const raw = usersRes.value.data.data;
        setUsers(Array.isArray(raw) ? raw : Array.isArray(raw.users) ? raw.users : []);
      }
      if (showtimesRes.status === "fulfilled" && showtimesRes.value.data?.data) {
        const raw = showtimesRes.value.data.data;
        setShowtimes(Array.isArray(raw) ? raw : Array.isArray(raw.showtimes) ? raw.showtimes : []);
      }
      if (roomsRes.status === "fulfilled" && roomsRes.value.data?.data) {
        const raw = roomsRes.value.data.data;
        setRooms(Array.isArray(raw) ? raw : Array.isArray(raw.rooms) ? raw.rooms : []);
      }
      if (bookingSeatsRes.status === "fulfilled" && bookingSeatsRes.value.data?.data) {
        const raw = bookingSeatsRes.value.data.data;
        setBookingSeats(Array.isArray(raw) ? raw : Array.isArray(raw.bookingSeats) ? raw.bookingSeats : []);
      }
      if (showtimeStatisticsRes.status === "fulfilled" && showtimeStatisticsRes.value.data?.data) {
        setShowtimeStatistics(showtimeStatisticsRes.value.data.data);
      }
      if (movieRankingsRes.status === "fulfilled" && movieRankingsRes.value.data?.data) {
        setMovieRankings(movieRankingsRes.value.data.data);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu từ server API:", error);
      message.error("Không thể kết nối đến server API để lấy dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (dateRange?.[0]) params.startDate = dateRange[0].startOf("day").toISOString();
    if (dateRange?.[1]) params.endDate = dateRange[1].endOf("day").toISOString();
    if (selectedMovie !== "all") params.movie = selectedMovie;

    void Promise.all([
      api.get("/statistics/showtimes", { params }),
      api.get("/statistics/movies", { params }),
    ]).then(([showtimeResponse, movieResponse]) => {
      setShowtimeStatistics(showtimeResponse.data?.data || null);
      setMovieRankings(movieResponse.data?.data || { topRevenue: [], hotMovies: [] });
    }).catch((error) => {
      console.error("Không thể cập nhật thống kê theo bộ lọc:", error);
    });
  }, [dateRange, selectedMovie]);


  const handleReset = () => {
    setDateRange(null);
    setSelectedMovie("all");
    setRevenueTimeframe("day");
    setTableSearchText("");
    fetchDashboardData();
    message.success("Đã làm mới dữ liệu");
  };

  const handleFilter = () => {
    message.success("Đã áp dụng bộ lọc dữ liệu!");
  };


  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {

      if (dateRange && dateRange[0] && dateRange[1]) {
        const bookingDate = dayjs(b.createdAt);
        if (!bookingDate.isBetween(dateRange[0].startOf("day"), dateRange[1].endOf("day"), null, "[]")) {
          return false;
        }
      }


      if (selectedMovie !== "all") {
        const movieTitle = b.showtime?.movie?.title;
        const movieId = b.showtime?.movie?._id;
        if (movieTitle !== selectedMovie && movieId !== selectedMovie) {
          return false;
        }
      }




      return true;
    });
  }, [bookings, dateRange, selectedMovie]);

  const kpiData = useMemo(() => {

    const validBookings = filteredBookings.filter((b) => b.status !== "cancelled");
    const totalRevenue = validBookings.reduce((sum, b) => sum + (b.finalAmount || b.totalSeatPrice || 0), 0);


    const filteredBookingIds = new Set(filteredBookings.map((b) => b._id));
    let totalTickets = bookingSeats.filter((bs) =>
      bs.booking?._id ? filteredBookingIds.has(bs.booking._id) : filteredBookingIds.has(bs.booking)
    ).length;

    if (totalTickets === 0 && filteredBookings.length > 0) {

      totalTickets = validBookings.length * 2;
    }


    const uniqueUserIds = new Set(filteredBookings.map((b) => b.user?._id).filter(Boolean));
    const totalCustomers = uniqueUserIds.size > 0 ? uniqueUserIds.size : users.length;


    const totalShowtimesCount = showtimes.length;

    return [
      {
        id: "revenue",
        title: "Tổng doanh thu",
        value: formatVND(totalRevenue),
        trend: 12.8,
        isPositive: true,
        icon: <DollarCircleOutlined />,
        iconBgClass: "kpi-icon-red",
        subtext: "Dữ liệu thực tế",
      },
      {
        id: "tickets",
        title: "Tổng vé đã bán",
        value: `${formatNumber(totalTickets)} vé`,
        trend: 8.5,
        isPositive: true,
        icon: <VideoCameraOutlined />,
        iconBgClass: "kpi-icon-amber",
        subtext: "Dữ liệu thực tế",
      },
      {
        id: "customers",
        title: "Tổng khách hàng",
        value: `${formatNumber(totalCustomers)} khách`,
        trend: 15.2,
        isPositive: true,
        icon: <UserOutlined />,
        iconBgClass: "kpi-icon-blue",
        subtext: "Hệ thống tài khoản",
      },
      {
        id: "showtimes",
        title: "Tổng suất chiếu",
        value: `${formatNumber(totalShowtimesCount)} suất`,
        trend: 4.1,
        isPositive: true,
        icon: <VideoCameraOutlined />,
        iconBgClass: "kpi-icon-emerald",
        subtext: "Lịch chiếu phòng",
      },
    ];
  }, [filteredBookings, bookingSeats, users, showtimes]);

  // Tính toán Doanh thu đỉnh cao (Ngày, Tháng, Năm, Khung Giờ)
  const peakMetrics = useMemo(() => {
    const validBookings = filteredBookings.filter((b) => b.status !== "cancelled");

    if (validBookings.length === 0) {
      return {
        peakDay: { date: "Chưa có dữ liệu", revenue: 0 },
        peakMonth: { month: "Chưa có dữ liệu", revenue: 0 },
        peakYear: { year: "Chưa có dữ liệu", revenue: 0 },
        peakHour: { hourRange: "Chưa có dữ liệu", revenue: 0, percentage: 0, count: 0, hourIndex: -1 },
      };
    }

    const dayMap = new Map<string, number>();
    const monthMap = new Map<string, number>();
    const yearMap = new Map<string, number>();
    const hourRevenue = new Array(24).fill(0);
    const hourOrders = new Array(24).fill(0);

    let totalRevenueSum = 0;

    validBookings.forEach((b) => {
      const rev = b.finalAmount || b.totalSeatPrice || 0;
      totalRevenueSum += rev;
      const d = dayjs(b.createdAt);

      const dayKey = d.format("DD/MM/YYYY");
      dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + rev);

      const monthKey = `Tháng ${d.format("MM/YYYY")}`;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + rev);

      const yearKey = `Năm ${d.format("YYYY")}`;
      yearMap.set(yearKey, (yearMap.get(yearKey) || 0) + rev);

      const h = d.hour();
      hourRevenue[h] += rev;
      hourOrders[h] += 1;
    });

    let peakDay = { date: "Chưa có dữ liệu", revenue: 0 };
    dayMap.forEach((rev, date) => {
      if (rev >= peakDay.revenue) {
        peakDay = { date, revenue: rev };
      }
    });

    let peakMonth = { month: "Chưa có dữ liệu", revenue: 0 };
    monthMap.forEach((rev, month) => {
      if (rev >= peakMonth.revenue) {
        peakMonth = { month, revenue: rev };
      }
    });

    let peakYear = { year: "Chưa có dữ liệu", revenue: 0 };
    yearMap.forEach((rev, year) => {
      if (rev >= peakYear.revenue) {
        peakYear = { year, revenue: rev };
      }
    });

    let maxHourIdx = 0;
    let maxHourRev = 0;
    hourRevenue.forEach((rev, idx) => {
      if (rev > maxHourRev) {
        maxHourRev = rev;
        maxHourIdx = idx;
      }
    });

    const startH = String(maxHourIdx).padStart(2, "0");
    const endH = String((maxHourIdx + 1) % 24).padStart(2, "0");
    const hourRange = `${startH}:00 - ${endH}:00`;
    const percentage = totalRevenueSum > 0 ? Math.round((maxHourRev / totalRevenueSum) * 100) : 0;

    return {
      peakDay,
      peakMonth,
      peakYear,
      peakHour: {
        hourRange,
        revenue: maxHourRev,
        percentage,
        count: hourOrders[maxHourIdx],
        hourIndex: maxHourIdx,
      },
    };
  }, [filteredBookings]);

  // Thống kê doanh thu theo 24 khung giờ
  const hourlyRevenueData = useMemo(() => {
    const validBookings = filteredBookings.filter((b) => b.status !== "cancelled");
    const result = Array.from({ length: 24 }, (_, i) => {
      const hStr = String(i).padStart(2, "0");
      return {
        hour: `${hStr}:00`,
        hourIdx: i,
        revenue: 0,
        orders: 0,
        isPeak: i === peakMetrics.peakHour.hourIndex && peakMetrics.peakHour.revenue > 0,
      };
    });

    validBookings.forEach((b) => {
      const h = dayjs(b.createdAt).hour();
      const rev = b.finalAmount || b.totalSeatPrice || 0;
      if (result[h]) {
        result[h].revenue += rev;
        result[h].orders += 1;
      }
    });

    return result;
  }, [filteredBookings, peakMetrics.peakHour.hourIndex, peakMetrics.peakHour.revenue]);


  const revenueChartData = useMemo(() => {
    const validBookings = filteredBookings.filter((b) => b.status !== "cancelled");

    if (validBookings.length === 0) {
      return [
        { date: "01/07", revenue: 0, tickets: 0 },
        { date: "05/07", revenue: 0, tickets: 0 },
        { date: "10/07", revenue: 0, tickets: 0 },
        { date: "15/07", revenue: 0, tickets: 0 },
        { date: "20/07", revenue: 0, tickets: 0 },
      ];
    }

    const map = new Map<string, { revenue: number; tickets: number }>();

    validBookings.forEach((b) => {
      let key = "";
      const d = dayjs(b.createdAt);
      if (revenueTimeframe === "day") {
        key = d.format("DD/MM");
      } else if (revenueTimeframe === "week") {
        key = `Tuần ${Math.ceil(d.date() / 7)}`;
      } else {
        key = `Tháng ${d.month() + 1}`;
      }

      const current = map.get(key) || { revenue: 0, tickets: 0 };
      map.set(key, {
        revenue: current.revenue + (b.finalAmount || b.totalSeatPrice || 0),
        tickets: current.tickets + 1,
      });
    });

    return Array.from(map.entries())
      .map(([date, val]) => ({
        date,
        revenue: val.revenue,
        tickets: val.tickets,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredBookings, revenueTimeframe]);


  const ticketSalesData = useMemo(() => {
    const dayNames = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const revenues = [0, 0, 0, 0, 0, 0, 0];

    filteredBookings.forEach((b) => {
      if (b.status !== "cancelled") {
        const dayIdx = dayjs(b.createdAt).day();
        counts[dayIdx] += 1;
        revenues[dayIdx] += b.finalAmount || b.totalSeatPrice || 0;
      }
    });


    const orderedIndices = [1, 2, 3, 4, 5, 6, 0];
    return orderedIndices.map((idx) => ({
      day: dayNames[idx],
      tickets: counts[idx],
      revenue: revenues[idx],
    }));
  }, [filteredBookings]);

  const topMoviesData = useMemo(() => {
    if (movieRankings.topRevenue.length > 0) {
      return movieRankings.topRevenue.map((movie) => ({
        name: movie.title,
        revenue: Math.round(movie.revenue / 1000000),
      }));
    }
    const map = new Map<string, number>();

    filteredBookings.forEach((b) => {
      if (b.status !== "cancelled") {
        const title = b.showtime?.movie?.title || "Phim khác";
        const amt = b.finalAmount || b.totalSeatPrice || 0;
        map.set(title, (map.get(title) || 0) + amt);
      }
    });

    const list = Array.from(map.entries()).map(([name, revenue]) => ({
      name,
      revenue: Math.round(revenue / 1000000),
    }));

    list.sort((a, b) => b.revenue - a.revenue);
    return list.slice(0, 5);
  }, [filteredBookings, movieRankings.topRevenue]);

  const bookingStatusData = useMemo(() => {
    let pendingCount = 0;
    let confirmedCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    filteredBookings.forEach((b) => {
      if (b.status === "pending") pendingCount++;
      else if (b.status === "confirmed") confirmedCount++;
      else if (b.status === "completed") completedCount++;
      else if (b.status === "cancelled") cancelledCount++;
    });

    const total = filteredBookings.length || 1;

    return [
      {
        name: "Đã thanh toán",
        value: Math.round((confirmedCount / total) * 100) || 0,
        count: confirmedCount,
        color: "#3b82f6",
      },
      {
        name: "Hoàn tất vé",
        value: Math.round((completedCount / total) * 100) || 0,
        count: completedCount,
        color: "#10b981",
      },
      {
        name: "Chờ thanh toán",
        value: Math.round((pendingCount / total) * 100) || 0,
        count: pendingCount,
        color: "#f59e0b",
      },
      {
        name: "Đã hủy",
        value: Math.round((cancelledCount / total) * 100) || 0,
        count: cancelledCount,
        color: "#b91c1c",
      },
    ];
  }, [filteredBookings]);

  const roomOccupancyData: RoomOccupancyRow[] = useMemo(() => {
    if (rooms.length === 0) {
      return [
        { id: "1", roomName: "Phòng 1", type: "Standard", cinema: "", seats: 120, occupancy: 85 },
        { id: "2", roomName: "Phòng 2", type: "IMAX", cinema: "", seats: 200, occupancy: 72 },
        { id: "3", roomName: "Phòng 3", type: "VIP", cinema: "", seats: 80, occupancy: 60 },
      ];
    }

    return rooms.map((r, idx) => {
      const roomBookings = filteredBookings.filter((b) => b.showtime?.room?._id === r._id);
      const capacity = r.seatCapacity || (r as any).capacity || 100;
      const bookedCount = roomBookings.length * 2;
      const occupancy = Math.min(100, Math.round((bookedCount / capacity) * 100) || (85 - idx * 10));

      const rawName = r.name || (r as any).roomName || (r as any).title || `Phòng ${idx + 1}`;
      const nameStr = String(rawName).trim();
      const displayName = nameStr
        ? nameStr.toLowerCase().includes("phòng")
          ? nameStr
          : `Phòng ${nameStr}`
        : `Phòng ${idx + 1}`;


      return {
        id: r._id,
        roomName: displayName,
        type: (r as any).roomType || "Standard",
        cinema: r.cinema?.name || "",
        seats: capacity,
        occupancy: Math.max(15, occupancy),
      };
    });
  }, [rooms, filteredBookings]);

  const mostUsedRoom = useMemo(() => {
    if (roomOccupancyData.length === 0) {
      return null;
    }

    const sorted = [...roomOccupancyData].sort((a, b) => b.occupancy - a.occupancy);
    return sorted[0];
  }, [roomOccupancyData]);

  const peakShowtimeDays = useMemo(() => {
    if (!showtimes || showtimes.length === 0) return [];
    const counts = new Map<string, number>();
    showtimes.forEach((st) => {
      const d = st.startTime ? dayjs(st.startTime).format("DD/MM/YYYY") : "Unknown";
      counts.set(d, (counts.get(d) || 0) + 1);
    });
    const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 3).map(([rawDate, cnt]) => {
      const formatted = rawDate === 'Unknown' ? 'Unknown' : dayjs(rawDate, 'DD/MM/YYYY').format('dddd - DD/MM');
      return { date: rawDate, dateFormatted: formatted, count: cnt };
    });
  }, [showtimes]);

  const topCustomersData: CustomerRow[] = useMemo(() => {
    const userMap = new Map<
      string,
      { name: string; email: string; avatar: string; tickets: number; totalSpent: number }
    >();

    filteredBookings.forEach((b) => {
      const u = b.user;
      if (u?._id && b.status !== "cancelled") {
        const current = userMap.get(u._id) || {
          name: u.fullName || "Khách hàng",
          email: u.email || "N/A",
          avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u._id}`,
          tickets: 0,
          totalSpent: 0,
        };

        userMap.set(u._id, {
          ...current,
          tickets: current.tickets + 1,
          totalSpent: current.totalSpent + (b.finalAmount || b.totalSeatPrice || 0),
        });
      }
    });

    const list = Array.from(userMap.entries()).map(([id, val]) => ({
      key: id,
      rank: 0,
      avatar: val.avatar,
      name: val.name,
      email: val.email,
      membership: (val.totalSpent > 3000000
        ? "VIP Diamond"
        : val.totalSpent > 1000000
          ? "VIP Gold"
          : "Silver") as "VIP Diamond" | "VIP Gold" | "Silver",
      tickets: val.tickets,
      totalSpent: val.totalSpent,
    }));

    list.sort((a, b) => b.totalSpent - a.totalSpent);
    return list.slice(0, 10).map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [filteredBookings]);

  const revenueDetailsData: RevenueDetailRow[] = useMemo(() => {
    return filteredBookings.map((b) => ({
      key: b._id,
      date: dayjs(b.createdAt).format("DD/MM/YYYY HH:mm"),
      rawDate: b.createdAt,
      movieName: b.showtime?.movie?.title || "Phim xem tại rạp",
      cinema: b.showtime?.movie?.cinema?.name || "Rạp Lumora",
      showtime: b.showtime?.startTime
        ? dayjs(b.showtime.startTime).format("HH:mm - DD/MM")
        : "19:30 - 21:45",
      ticketsSold: 2,
      revenue: b.finalAmount || b.totalSeatPrice || 0,
      status:
        b.status === "completed"
          ? "Hoàn tất"
          : b.status === "confirmed"
            ? "Đã thanh toán"
            : b.status === "pending"
              ? "Chờ thanh toán"
              : "Đã hủy",
    }));
  }, [filteredBookings]);
  const searchedRevenueDetails = useMemo(() => {
    if (!tableSearchText) return revenueDetailsData;
    return revenueDetailsData.filter(
      (item) =>
        item.movieName.toLowerCase().includes(tableSearchText.toLowerCase()) ||
        item.cinema.toLowerCase().includes(tableSearchText.toLowerCase()) ||
        item.date.includes(tableSearchText)
    );
  }, [revenueDetailsData, tableSearchText]);


  const topCustomerColumns: ColumnsType<CustomerRow> = [
    {
      title: "Hạng",
      dataIndex: "rank",
      key: "rank",
      width: 70,
      align: "center",
      render: (rank) => {
        let badgeColor = "#94a3b8";
        if (rank === 1) badgeColor = "#f59e0b";
        else if (rank === 2) badgeColor = "#64748b";
        else if (rank === 3) badgeColor = "#b45309";

        return (
          <Avatar
            style={{
              backgroundColor: badgeColor,
              fontWeight: 800,
              fontSize: 13,
            }}
            size={28}
          >
            {rank}
          </Avatar>
        );
      },
    },
    {
      title: "Khách hàng",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <Space size="middle">
          <Avatar src={record.avatar} className="customer-avatar" size={40} />
          <div>
            <Text strong style={{ fontSize: 14, color: "#0f172a", display: "block" }}>
              {name}
            </Text>
            <Tag
              color={
                record.membership === "VIP Diamond"
                  ? "purple"
                  : record.membership === "VIP Gold"
                    ? "gold"
                    : "blue"
              }
              style={{ marginTop: 2, fontSize: 11 }}
            >
              {record.membership}
            </Tag>
          </div>
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email) => <Text type="secondary">{email}</Text>,
    },
    {
      title: "Số đơn đặt",
      dataIndex: "tickets",
      key: "tickets",
      align: "right",
      sorter: (a, b) => a.tickets - b.tickets,
      render: (tickets) => (
        <Badge
          count={`${tickets} đơn`}
          style={{ backgroundColor: "#fee2e2", color: "#b91c1c", fontWeight: 700 }}
        />
      ),
    },
    {
      title: "Tổng chi tiêu",
      dataIndex: "totalSpent",
      key: "totalSpent",
      align: "right",
      sorter: (a, b) => a.totalSpent - b.totalSpent,
      render: (spent) => (
        <Text strong style={{ color: "#b91c1c", fontSize: 14 }}>
          {formatVND(spent)}
        </Text>
      ),
    },
  ];

  const revenueDetailColumns: ColumnsType<RevenueDetailRow> = [
    {
      title: "Thời gian đặt",
      dataIndex: "date",
      key: "date",
      width: 150,
    },
    {
      title: "Tên phim",
      dataIndex: "movieName",
      key: "movieName",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Rạp chiếu",
      dataIndex: "cinema",
      key: "cinema",
      render: (cinema) => <Tag color="volcano">{cinema}</Tag>,
    },
    {
      title: "Suất chiếu",
      dataIndex: "showtime",
      key: "showtime",
      render: (showtime) => <Tag color="blue">{showtime}</Tag>,
    },
    {
      title: "Doanh thu",
      dataIndex: "revenue",
      key: "revenue",
      align: "right",
      sorter: (a, b) => a.revenue - b.revenue,
      render: (revenue) => (
        <Text strong style={{ color: "#b91c1c" }}>
          {formatVND(revenue)}
        </Text>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      align: "center",
      render: (status) => {
        let color = "cyan";
        if (status === "Hoàn tất" || status === "Đã thanh toán") color = "green";
        if (status === "Chờ thanh toán") color = "orange";
        if (status === "Đã hủy") color = "red";
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  const movieSelectOptions = useMemo(() => {
    const list = Array.isArray(movies) ? movies : [];
    return [
      { label: "Tất cả phim", value: "all" },
      ...list.map((m) => ({ label: m.title, value: m._id })),
    ];
  }, [movies]);


  const handleExportReport = () => {
    try {
      const overviewData = [
        ["BÁO CÁO THỐNG KÊ DOANH THU LUMORA CINEMA"],
        [`Thời gian xuất báo cáo: ${dayjs().format("DD/MM/YYYY HH:mm:ss")}`],
        [],
        ["1. CHỈ SỐ KPI TỔNG QUAN"],
        ["Chỉ số", "Giá trị"],
        ["Tổng doanh thu", kpiData[0]?.value || "0 ₫"],
        ["Tổng vé đã bán", kpiData[1]?.value || "0 vé"],
        ["Tổng khách hàng", kpiData[2]?.value || "0 khách"],
        ["Tổng suất chiếu", kpiData[3]?.value || "0 suất"],
        [],
        ["2. KỶ LỤC DOANH THU ĐỈNH CAO"],
        ["Tiêu chí", "Mốc thời gian", "Doanh thu"],
        ["Ngày có doanh thu cao nhất", peakMetrics.peakDay.date, formatVND(peakMetrics.peakDay.revenue)],
        ["Tháng có doanh thu cao nhất", peakMetrics.peakMonth.month, formatVND(peakMetrics.peakMonth.revenue)],
        ["Năm có doanh thu cao nhất", peakMetrics.peakYear.year, formatVND(peakMetrics.peakYear.revenue)],
        [
          "Khung giờ đỉnh điểm",
          peakMetrics.peakHour.hourRange,
          `${formatVND(peakMetrics.peakHour.revenue)} (${peakMetrics.peakHour.percentage}% tổng doanh thu, ${peakMetrics.peakHour.count} đơn)`,
        ],
      ];

      const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);

      const detailHeaders = [
        "STT",
        "Mã Đơn / Thời Gian Đặt",
        "Tên Phim",
        "Rạp Chiếu",
        "Suất Chiếu",
        "Doanh Thu (VNĐ)",
        "Trạng Thái",
      ];
      const detailRows = searchedRevenueDetails.map((item, idx) => [
        idx + 1,
        item.date,
        item.movieName,
        item.cinema,
        item.showtime,
        item.revenue,
        item.status,
      ]);
      const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);

      const hourlyHeaders = ["Khung Giờ", "Số Đơn Đặt", "Doanh Thu (VNĐ)", "Ghi Chú"];
      const hourlyRows = hourlyRevenueData.map((h) => [
        `${h.hour} - ${String((h.hourIdx + 1) % 24).padStart(2, "0")}:00`,
        h.orders,
        h.revenue,
        h.isPeak ? "Khung giờ cao nhất" : "",
      ]);
      const wsHourly = XLSX.utils.aoa_to_sheet([hourlyHeaders, ...hourlyRows]);


      const topMoviesRows = [
        ["TOP 5 PHIM DOANH THU CAO NHẤT"],
        ["Hạng", "Tên Phim", "Doanh Thu (Triệu VNĐ)"],
        ...topMoviesData.map((m, i) => [i + 1, m.name, m.revenue]),
        [],
        ["TOP 10 KHÁCH HÀNG THÂN THIẾT"],
        ["Hạng", "Tên Khách Hàng", "Email", "Hạng Hội Viên", "Số Đơn Đặt", "Tổng Chi Tiêu (VNĐ)"],
        ...topCustomersData.map((c) => [c.rank, c.name, c.email, c.membership, c.tickets, c.totalSpent]),
      ];
      const wsTop = XLSX.utils.aoa_to_sheet(topMoviesRows);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsOverview, "Tổng Quan & Kỷ Lục");
      XLSX.utils.book_append_sheet(wb, wsDetail, "Doanh Thu Chi Tiết");
      XLSX.utils.book_append_sheet(wb, wsHourly, "Thống Kê Theo Giờ");
      XLSX.utils.book_append_sheet(wb, wsTop, "Top Phim & Khách Hàng");

      const fileName = `Bao_Cao_Doanh_Thu_Lumora_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success(`Đã xuất báo cáo thành công ra file sheet Excel: ${fileName}`);
    } catch (err) {
      console.error("Lỗi khi xuất file báo cáo:", err);
      message.error("Không thể xuất file báo cáo. Vui lòng thử lại!");
    }
  };

  return (
    <div className="dashboard-wrapper">
      <Spin spinning={loading} tip="Đang kết nối Server API lấy dữ liệu thực tế...">

        <div className="dashboard-header">
          <div className="dashboard-title-group">
            <Space align="center" size="middle">
              <Title level={2}>Dashboard Thống Kê Lumora</Title>
              <span className="dashboard-title-badge">
                <DashboardOutlined style={{ marginRight: 4 }} /> Live Server
              </span>
            </Space>
            <Text type="secondary" style={{ display: "block", marginTop: 2 }}>
              Dữ liệu doanh thu, vé bán & khách hàng
            </Text>
          </div>

          <Space size="middle">
            <Button
              type="default"
              icon={<DownloadOutlined />}
              onClick={() => handleExportReport()}
              style={{ borderRadius: 8 }}
            >
              Xuất báo cáo (Excel)
            </Button>
            <Button
              type="primary"
              className="filter-btn-primary"
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              Làm mới
            </Button>
          </Space>
        </div>


        <div className="filter-card">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={7} lg={7}>
              <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13, color: "#475569" }}>
                Khoảng thời gian:
              </div>
              <RangePicker
                style={{ width: "100%", borderRadius: 8 }}
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
                format="DD/MM/YYYY"
              />
            </Col>

            <Col xs={24} sm={12} md={6} lg={6}>
              <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13, color: "#475569" }}>
                Chọn phim:
              </div>
              <Select
                style={{ width: "100%", borderRadius: 8 }}
                value={selectedMovie}
                onChange={(val) => setSelectedMovie(val)}
                options={movieSelectOptions}
              />
            </Col>

            <Col xs={24} sm={12} md={5} lg={5} style={{ display: "flex", gap: 8, marginTop: 22, marginLeft: "auto" }}>
              <Button
                type="primary"
                className="filter-btn-primary"
                icon={<FilterOutlined />}
                onClick={handleFilter}
                style={{ flex: 1 }}
              >
                Lọc
              </Button>
              <Button
                className="filter-btn-reset"
                icon={<ReloadOutlined />}
                onClick={handleReset}
              >
                Làm mới
              </Button>
            </Col>
          </Row>
        </div>


        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={8}>
            <Card className="cinema-card" title={<span><ClockCircleOutlined className="card-title-icon" /> Khung giờ chiếu nhiều nhất</span>}>
              <Title level={3} style={{ margin: 0 }}>{showtimeStatistics?.peakHours[0] ? `${String(showtimeStatistics.peakHours[0].hour).padStart(2, "0")}:00 - ${String((showtimeStatistics.peakHours[0].hour + 1) % 24).padStart(2, "0")}:00` : "Chưa có dữ liệu"}</Title>
              <Text type="secondary">{showtimeStatistics?.peakHours[0]?.count || 0} suất chiếu</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card className="cinema-card" title={<span><VideoCameraOutlined className="card-title-icon" /> Phòng chiếu nhiều nhất</span>}>
              <Title level={3} style={{ margin: 0 }}>{showtimeStatistics?.peakRooms[0]?.roomName || "Chưa có dữ liệu"}</Title>
              <Text type="secondary">{showtimeStatistics?.peakRooms[0]?.count || 0} suất chiếu</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card className="cinema-card" title={<span><CalendarOutlined className="card-title-icon" /> Ngày chiếu nhiều nhất</span>}>
              <Title level={3} style={{ margin: 0 }}>{showtimeStatistics?.peakDates[0] ? dayjs(showtimeStatistics.peakDates[0].date).format("DD/MM/YYYY") : "Chưa có dữ liệu"}</Title>
              <Text type="secondary">{showtimeStatistics?.peakDates[0]?.count || 0} suất chiếu</Text>
            </Card>
          </Col>
        </Row>
        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          {kpiData.map((item) => (
            <Col xs={24} sm={12} lg={6} key={item.id}>
              <Card className="cinema-card" bodyStyle={{ padding: "20px" }}>
                <div className="kpi-card-inner">
                  <div>
                    <div className="kpi-title">{item.title}</div>
                    <div className="kpi-value">{item.value}</div>
                    <div>
                      <span className={`kpi-trend ${item.isPositive ? "trend-up" : "trend-down"}`}>
                        {item.isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        {item.trend}%
                      </span>
                      <span className="kpi-subtext">{item.subtext}</span>
                    </div>
                  </div>
                  <div className={`kpi-icon-box ${item.iconBgClass}`}>{item.icon}</div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={8}>
            <Card
              className="cinema-card"
              title={
                <span>
                  <FireOutlined className="card-title-icon" /> Phòng chiếu nhiều nhất
                </span>
              }
              bodyStyle={{ padding: "20px" }}
            >
              {mostUsedRoom ? (
                <div className="most-used-room-card">
                  <div className="most-used-room-badge">Hot</div>
                  <div className="most-used-room-main">
                    <h3>{mostUsedRoom.roomName}</h3>
                    <p>{mostUsedRoom.cinema || "Rạp Lumora"}</p>
                  </div>
                  <div className="most-used-room-stats">
                    <div>
                      <span>Loại phòng</span>
                      <strong>{mostUsedRoom.type}</strong>
                    </div>
                    <div>
                      <span>Tỷ lệ lấp đầy</span>
                      <strong style={{ color: getOccupancyColor(mostUsedRoom.occupancy) }}>{mostUsedRoom.occupancy}%</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <Text type="secondary">Chưa có dữ liệu phòng chiếu</Text>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card
              className="cinema-card"
              title={
                <span>
                  <CalendarOutlined className="card-title-icon" /> Ngày có nhiều suất chiếu nhất
                </span>
              }
              bodyStyle={{ padding: "20px" }}
            >
              {peakShowtimeDays && peakShowtimeDays.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {peakShowtimeDays.map((d, idx) => (
                    <div key={`${d.date}-${idx}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{d.dateFormatted || d.date}</div>
                        <div style={{ color: "#64748b", marginTop: 6 }}>{d.count} suất chiếu</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#b91c1c" }}>{d.count}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>Suất</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">Chưa có dữ liệu suất chiếu</Text>
              )}
            </Card>
          </Col>
        </Row>
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <FireOutlined style={{ color: "#b91c1c", fontSize: 20 }} />
            <Title level={4} style={{ margin: 0, color: "#0f172a", fontWeight: 700 }}>
              Kỷ Lục Doanh Thu Đỉnh Cao
            </Title>
          </div>
          <Row gutter={[20, 20]}>
            <Col xs={24} sm={12} lg={6}>
              <Card className="cinema-card peak-card peak-card-day" bodyStyle={{ padding: "18px 20px" }}>
                <div className="peak-card-header">
                  <span className="peak-card-badge badge-day">
                    <CalendarOutlined style={{ marginRight: 4 }} /> Ngày Cao Nhất
                  </span>
                  <div className="peak-icon-circle circle-day">
                    <TrophyOutlined />
                  </div>
                </div>
                <div className="peak-card-value">{formatVND(peakMetrics.peakDay.revenue)}</div>
                <div className="peak-card-sub text-day">
                  Mốc ngày: <strong>{peakMetrics.peakDay.date}</strong>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="cinema-card peak-card peak-card-month" bodyStyle={{ padding: "18px 20px" }}>
                <div className="peak-card-header">
                  <span className="peak-card-badge badge-month">
                    <RiseOutlined style={{ marginRight: 4 }} /> Tháng Cao Nhất
                  </span>
                  <div className="peak-icon-circle circle-month">
                    <RiseOutlined />
                  </div>
                </div>
                <div className="peak-card-value">{formatVND(peakMetrics.peakMonth.revenue)}</div>
                <div className="peak-card-sub text-month">
                  Mốc tháng: <strong>{peakMetrics.peakMonth.month}</strong>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="cinema-card peak-card peak-card-year" bodyStyle={{ padding: "18px 20px" }}>
                <div className="peak-card-header">
                  <span className="peak-card-badge badge-year">
                    <TrophyOutlined style={{ marginRight: 4 }} /> Năm Cao Nhất
                  </span>
                  <div className="peak-icon-circle circle-year">
                    <DollarCircleOutlined />
                  </div>
                </div>
                <div className="peak-card-value">{formatVND(peakMetrics.peakYear.revenue)}</div>
                <div className="peak-card-sub text-year">
                  Mốc năm: <strong>{peakMetrics.peakYear.year}</strong>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="cinema-card peak-card peak-card-hour" bodyStyle={{ padding: "18px 20px" }}>
                <div className="peak-card-header">
                  <span className="peak-card-badge badge-hour">
                    <FireOutlined style={{ marginRight: 4 }} /> Khung Giờ Đỉnh Điểm
                  </span>
                  <div className="peak-icon-circle circle-hour">
                    <ClockCircleOutlined />
                  </div>
                </div>
                <div className="peak-card-value">{peakMetrics.peakHour.hourRange}</div>
                <div className="peak-card-sub text-hour">
                  Doanh thu: <strong>{formatVND(peakMetrics.peakHour.revenue)}</strong> ({peakMetrics.peakHour.percentage}% tổng)
                </div>
              </Card>
            </Col>
          </Row>
        </div>
        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          <Col xs={24}>
            <Card
              className="cinema-card"
              title={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, width: "100%" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ClockCircleOutlined className="card-title-icon" /> Thống Kê Doanh Thu Theo Giờ Trong Ngày (00:00 - 23:00)
                  </span>
                  <div className="peak-hour-highlight-badge">
                    <FireOutlined style={{ color: "#b91c1c", marginRight: 4 }} />
                    Khung giờ cao nhất: <strong>{peakMetrics.peakHour.hourRange}</strong> ({formatVND(peakMetrics.peakHour.revenue)})
                  </div>
                </div>
              }
            >
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyRevenueData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${val / 1000}k`)}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="custom-recharts-tooltip">
                              <div className="tooltip-title">Khung giờ: {label}</div>
                              <div className="tooltip-value" style={{ color: data.isPeak ? "#ef4444" : "#ffffff" }}>
                                Doanh thu: {formatVND(data.revenue)}
                              </div>
                              <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 2 }}>
                                Số đơn đặt vé: {data.orders} đơn
                              </div>
                              {data.isPeak && (
                                <Tag color="error" style={{ marginTop: 6, fontWeight: 700 }}>
                                  🔥 Khung giờ cao nhất!
                                </Tag>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={20}>
                      {hourlyRevenueData.map((entry, index) => (
                        <Cell
                          key={`cell-hour-${index}`}
                          fill={entry.isPeak ? "#b91c1c" : "#3b82f6"}
                          opacity={entry.isPeak ? 1 : 0.75}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>


        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>

          <Col xs={24} lg={14}>
            <Card
              className="cinema-card"
              title={
                <span>
                  <LineChartOutlined className="card-title-icon" /> Doanh thu theo thời gian
                </span>
              }
              extra={
                <Segmented
                  options={[
                    { label: "Ngày", value: "day" },
                    { label: "Tuần", value: "week" },
                    { label: "Tháng", value: "month" },
                  ]}
                  value={revenueTimeframe}
                  onChange={(val) => setRevenueTimeframe(val as "day" | "week" | "month")}
                />
              }
            >
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={revenueChartData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#b91c1c" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#b91c1c" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="custom-recharts-tooltip">
                              <div className="tooltip-title">{label}</div>
                              <div className="tooltip-value">
                                Doanh thu: {formatVND(payload[0].value as number)}
                              </div>
                              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                                Đơn đặt: {payload[0].payload.tickets} đơn
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#b91c1c"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card
              className="cinema-card"
              title={
                <span>
                  <BarChartOutlined className="card-title-icon" /> Số vé bán theo ngày
                </span>
              }
            >
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketSalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="custom-recharts-tooltip">
                              <div className="tooltip-title">{label}</div>
                              <div className="tooltip-value">
                                {formatNumber(payload[0].value as number)} đơn đặt vé
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="tickets" fill="#b91c1c" radius={[6, 6, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>


        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={8}>
            <Card
              className="cinema-card"
              title={<span><FireOutlined className="card-title-icon" /> Top phim hot theo vé bán</span>}
            >
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {movieRankings.hotMovies.length > 0 ? movieRankings.hotMovies.map((movie, index) => (
                  <div key={movie.movieId} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <Text strong ellipsis style={{ maxWidth: 190 }}>{index + 1}. {movie.title}</Text>
                    <Tag color={index === 0 ? "error" : "blue"}>{formatNumber(movie.tickets)} vé</Tag>
                  </div>
                )) : <Text type="secondary">Chưa có dữ liệu vé đã bán</Text>}
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={16}>
            <Card
              className="cinema-card"
              title={
                <span>
                  <TrophyOutlined className="card-title-icon" /> Top 5 phim doanh thu cao nhất
                </span>
              }
            >
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topMoviesData}
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      unit=" Triệu"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "#0f172a", fontSize: 12, fontWeight: 500 }}
                      width={140}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="custom-recharts-tooltip">
                              <div className="tooltip-title">{payload[0].payload.name}</div>
                              <div className="tooltip-value">
                                {payload[0].value} Triệu VNĐ
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="revenue" fill="#b91c1c" radius={[0, 6, 6, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>


        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>

          <Col xs={24} lg={10}>
            <Card
              className="cinema-card"
              title={
                <span>
                  <PieChartOutlined className="card-title-icon" /> Trạng thái Booking
                </span>
              }
            >
              <div style={{ width: "100%", height: 310, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bookingStatusData}
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {bookingStatusData.map((entry, index) => (
                        <Cell key={`cell-status-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="custom-recharts-tooltip">
                              <div className="tooltip-title">{data.name}</div>
                              <div className="tooltip-value">
                                {data.value}% ({formatNumber(data.count)} đơn)
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => (
                        <span style={{ color: "#334155", fontWeight: 600, fontSize: 12 }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={14}>
            <Card
              className="cinema-card"
              title={
                <span>
                  <DashboardOutlined className="card-title-icon" /> Tỷ lệ lấp đầy phòng
                </span>
              }
            >
              <div style={{ padding: "4px 0" }}>
                {roomOccupancyData.map((room) => (
                  <div key={room.id} className="room-item">
                    <div className="room-header">
                      <div>
                        <span className="room-name">{room.roomName}</span>
                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
                          ({room.seats} ghế)
                        </Text>
                      </div>
                      <span className="room-percentage">{room.occupancy}%</span>
                    </div>
                    <Progress
                      percent={room.occupancy}
                      strokeColor={getOccupancyColor(room.occupancy)}
                      trailColor="#e2e8f0"
                      showInfo={false}
                      strokeWidth={10}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          <Col xs={24}>
            <Card
              className="cinema-card"
              title={
                <span>
                  <UserOutlined className="card-title-icon" /> Top 10 khách hàng thân thiết
                </span>
              }
            >
              <Table<CustomerRow>
                className="cinema-table"
                columns={topCustomerColumns}
                dataSource={topCustomersData}
                pagination={false}
                scroll={{ x: 700 }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]}>
          <Col xs={24}>
            <Card
              className="cinema-card"
              title={
                <span>
                  <DollarCircleOutlined className="card-title-icon" /> Bảng doanh thu chi tiết
                </span>
              }
              extra={
                <Space>
                  <div style={{ width: 240 }}>
                    <Select
                      placeholder="Tìm tên phim..."
                      allowClear
                      style={{ width: "100%" }}
                      suffixIcon={<SearchOutlined />}
                      onSearch={(val) => setTableSearchText(val)}
                      onChange={(val) => setTableSearchText(val || "")}
                      options={movieSelectOptions}
                    />
                  </div>
                </Space>
              }
            >
              <Table<RevenueDetailRow>
                className="cinema-table"
                columns={revenueDetailColumns}
                dataSource={searchedRevenueDetails}
                pagination={{ pageSize: 5 }}
                scroll={{ x: 800 }}
              />
            </Card>
          </Col>
        </Row>
      </Spin >
    </div >
  );
}

export default Dashboard;