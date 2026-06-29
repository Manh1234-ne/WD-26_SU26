import express from "express"
import { addRoom, createCinema, deleteCinema, getAllCinemas, getCinemaById, getCinemaShowtimes, getCinemaStats, getCities, updateCinema } from "../controllers/cinemaController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";

const routerCinema = express.Router();
//public
routerCinema.get("/", getAllCinemas);
routerCinema.get('/:id', getCinemaById);
routerCinema.get('/:id/showtimes', getCinemaShowtimes);
routerCinema.get('/cities', getCities);

//only Admin
routerCinema.post('/', protect, isAdmin, createCinema);
routerCinema.put('/:id', protect, isAdmin, updateCinema);
routerCinema.delete('/:id', protect, isAdmin, deleteCinema);
routerCinema.post('/:id/rooms', protect, isAdmin, addRoom);
routerCinema.get('/:id/stats', protect, isAdmin, getCinemaStats);



export default routerCinema;