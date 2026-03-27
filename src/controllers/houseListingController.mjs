import mongoose from 'mongoose';
import HouseListing from '../models/HouseListing.mjs';

export const getHouses = async (req, res, next) => {
  try {
    const houses = await HouseListing.find().populate('owner');
    if (!houses) {
      return res.status(500).json({
        status: 'fail',
        message: 'Failed to fetch houses',
      });
    }

    if (houses.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'No houses found',
      });
    }
    res.status(200).json({
      status: 'success',
      data: houses,
    });
  } catch (error) {
    next(error);
  }
};

export const createHouse = async (req, res) => {
  try {
    const house = new HouseListing(req.body);
    const savedHouse = await house.save();
    if (!savedHouse) {
      return res.status(500).json({
        status: 'fail',
        message: 'failed to create user',
      });
    }
    res.status(201).json({
      status: 'success',
      data: savedHouse,
    });
  } catch (error) {
    next(error);
  }
};

export const getHouseById = async (req, res, next) => {
  const houseId = req.params.id;

  //validate id opeartion
  if (!mongoose.Types.ObjectId.isValid) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid house ID format',
    });
  }
  try {
    const house = await HouseListing.findById(houseId).populate('Owner');
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

export const deleteHouse = async (req, res, next) => {
  const houseId = req.params.id;

  //validate id before delete operation
  if (!mongoose.Types.ObjectId.isValid) {
    res.status(400).json({
      status: 'fail',
      message: 'Invalid house ID format',
    });
  }

  try {
    const deletedHouse = await HouseListing.findByIdAndDelete(houseId);
    if (!deletedHouse) {
      return res.status(500).json({
        status: 'fail',
        message: 'INternal server error while deleting house',
      });
    }

    res.status(200).json({
      status: 'success',
      message: `house with id ${houseId} deleted successifully`,
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
    const updatedHouse = await HouseListing.findByIdAndUpdate(
      houseId,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedHouse) {
      return res.status(404).json({
        status: 'fail',
        message: `No house found with id ${houseId}`,
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
