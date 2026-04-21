import User from '../models/User.mjs';
import mongoose from "mongoose"
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';

//logic to get all users
export const getUsers = asyncHandler(async (req,res,next)=> {
    try {
        const allUsers = await User.find()
        if(!allUsers){
            return sendResponse(res, 500, false, "Not found ,failed to retrieve all users")
        }
        return sendResponse(res, 200, true, "All users retrieved ", allUsers)
    } catch (error) {
        next(error)
    }
    
});
//logic to get users by id
export const getUserById = asyncHandler(async (req,res, next)=> {
    try {
        const id = new mongoose.Types.ObjectId(req.params.id)
        const oneUser = await User.findById(id)
        if(!oneUser){
            return sendResponse(res, 404, false, "User not found")
        }

        return sendResponse(res, 200, true, "User found", oneUser)
    } catch (error) {
        next(error)
        
    }
    
});
//logic to get profile
export const getMyProfile = asyncHandler(async (req,res,next)=> {
    try {
        const id = req.user.id  
        const userProfile = await User.findById(id)

        if(!userProfile){
            return sendResponse(res, 404, false, "profile not found")
        }

        return sendResponse(res, 200, true, "Profile found", userProfile);
    } catch (error) {
        next(error)
    }
});
//logic to update user profile
export const updateMyProfile = asyncHandler(async (req,res, next)=> {
    try{

        const userId = req.user.sub ||req.user.id
        const {email, residentialAddress, name} = req.validatedData;
        const updates = {email,residentialAddress, name}
        // Define allowed fields for update
        const allowedUpdates =  ['email','residentialAddress', 'name'];
        const updateKeys = Object.keys(updates);
        const isValidUpdate = updateKeys.every(key => allowedUpdates.includes(key));

        if (!isValidUpdate || updateKeys.length === 0) {
            return sendResponse(res, 404, false, "Invalid or empty update fields")
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: {
                email: email,
                residentialAddress:residentialAddress,
                name:name
                } 
            },         
            { 
                returnDocument: 'after'
            }
        );

        if (!user) {
            return sendResponse(res, 404, false, "Profile not updated")
        }

        return sendResponse(res, 200, true, "Profile updated", user)

  } catch (error) {
    next(error)
  }
   
});
//logic to update User
export const deleteUser = asyncHandler(async (req,res)=> {
    try {
        const userId = new mongoose.Types.ObjectId(req.params.id)
        const deletedUser = await User.findByIdAndDelete(userId)
        if(!deletedUser){
            return sendResponse(res, 500, false, "Internal server error occurred while deleting a user")
        }

        return sendResponse(res, 200, true, `user ${userId} got deleted successfully`)

    } catch (error) {
        
    }
});

//promote user
export const promoteUser = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.params.id || req.params.sub;   
        const { role } = req.body;

        if (!role) {
        return sendResponse(res, 404, false, "New role not found");
        }

        const allowedRoles = ['agent', 'landlord', 'client', 'student', 'admin'];

        if (!allowedRoles.includes(role)) {
        return sendResponse(res, 404, false, "Invalid role");
        }

        const user = await User.findByIdAndUpdate(
        userId,
        { role: role },
        { returnDocument: 'after', runValidators: true } 
        );

        if (!user) {
        return sendResponse(res, 404, false, "User not found");
        }

        return sendResponse(res, 200, true, `User role changed to ${user.role}`);
    } catch (error) {
        next(error);
    }
});