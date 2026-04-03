import mongoose from 'mongoose';
import HouseListing from '../models/HouseListing.mjs';

export const getHouses = async (req, res, next) => {
  try {
    const houses = await HouseListing.find().populate('owner');
    res.status(200).json({
      status: 'success',
      data: houses,
    });
  } catch (error) {
    next(error);
  }
};

export const createHouse = async (req, res, next) => {
  try {
    const house = new HouseListing({ ...req.body, owner: req.user._id });
    const savedHouse = await house.save();
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
