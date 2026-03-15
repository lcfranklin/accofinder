import Dispute from '../models/Dispute.mjs';

export const getDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find();
    res.status(200).json(disputes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDispute = async (req, res) => {
  try {
    const savedDispute = await new Dispute(req.body).save();
    res.status(201).json(savedDispute);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
