import House from "../models/House.mjs";
import { asyncHandler } from "../utils/helpers.mjs";

export const getHouses = async (req, res) => {
  try {
    const houses = await House.find().populate('owner');
    res.status(200).json(houses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createHouse = asyncHandler(async (req, res, next) =>{
    const {property,
          title,
          description,
          costCategory,
          owner,
          numberOfRooms,
          numberOfBathrooms,
          floorNumber,
          hasLivingRoom,
          hasKitchen,
          squareFootage,
          monthlyRent,
          bookingFee,
          isAvailable} = req.body

    const requiredFields = ['property', 'title', 'costCategory', 'owner', 'numberOfRooms', 'numberOfBathrooms', 'monthlyRent', 'bookingFee'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
        return res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}` });
    }

    const house = await House.create({
          property,
          title,
          description,
          costCategory,
          owner,
          numberOfRooms,
          numberOfBathrooms,
          floorNumber,
          hasLivingRoom,
          hasKitchen,
          squareFootage,
          monthlyRent,
          bookingFee,
          isAvailable
    });

    if(!house) return res.status(400).json({ message: "Bad request, house not created" });
    res.status(200).json({ message: "House was created", house });
})
