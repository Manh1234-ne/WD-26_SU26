import express from "express"
import { addRoom, createCinema, deleteCinema, getAllCinemas, getCinemaById, getCinemaShowtimes, getCinemaStats, getCities, updateCinema } from "../controllers/cinemaController.js";

const routerCinema = express.Router();
//public
routerCinema.get("/", getAllCinemas);
routerCinema.get('/:id', getCinemaById);
routerCinema.get('/:id/showtimes', getCinemaShowtimes);
routerCinema.get('/cities', getCities);

//only Admin
routerCinema.post('/', createCinema);
routerCinema.put('/:id', updateCinema);
routerCinema.delete('/:id', deleteCinema);
routerCinema.post('/:id/rooms', addRoom);
routerCinema.get('/:id/stats', getCinemaStats);



export default routerCinema;