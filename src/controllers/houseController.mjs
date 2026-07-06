import House from "../models/House.mjs";
import { asyncHandler } from "../utils/helpers.mjs";

export const getHouses = async (req, res, next) => {
  try {
    const houses = await House.find().populate('owner');
    res.status(200).json(houses);
  } catch (error) {
    next(error);
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

export const getHouseById = async (req, res, next) => {
  const houseId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(houseId)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid house ID format',
    });
  }

  try {
    const house = await HouseListing.findById(houseId).populate('owner');
    if (!house) {
      return res.status(404).json({
        status: 'fail',
        message: `House with id ${houseId} not found`,
      });
    }
    res.status(200).json({
      status: 'success',
      data: house,
    });
  } catch (err) {
    next(err);
  }
};

export const updateHouse = async (req, res, next) => {
  const houseId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(houseId)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid house ID format',
    });
  }

  try {
    const { owner, ...safeBody } = req.body;

    const updatedHouse = await HouseListing.findByIdAndUpdate(
      houseId,
      { $set: safeBody },
      { new: true, runValidators: true },
    );

    if (!updatedHouse) {
      return res.status(404).json({
        status: 'fail',
        message: `House with id ${houseId} not found`,
      });
    }

    res.status(200).json({
      status: 'success',
      data: updatedHouse,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteHouse = async (req, res, next) => {
  const houseId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(houseId)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid house ID format',
    });
  }

  try {
    const deletedHouse = await HouseListing.findByIdAndDelete(houseId);
    if (!deletedHouse) {
      return res.status(404).json({
        status: 'fail',
        message: `House with id ${houseId} not found`,
      });
    }

    res.status(200).json({
      status: 'success',
      message: `House with id ${houseId} deleted successfully`,
    });
  } catch (err) {
    next(err);
  }
};
