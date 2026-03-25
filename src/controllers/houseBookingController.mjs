import HouseBooking from '../models/HouseBooking.mjs';

export const getBookings = async (req, res) => {
    try {
        const disputes = await HouseBooking.find();
        res.status(200).json(disputes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createBook = async (req, res) => {
    try {
        const savedDispute = await new HouseBooking(req.body).save();
        res.status(201).json(savedDispute);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};