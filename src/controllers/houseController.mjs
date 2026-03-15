import House from '../models/House.mjs';

export const getHouses = async (req, res) => {
  try {
    const houses = await House.find().populate('owner');
    res.status(200).json(houses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createHouse = async (req, res) => {
  try {
    const savedHouse = await new House(req.body).save();
    res.status(201).json(savedHouse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
