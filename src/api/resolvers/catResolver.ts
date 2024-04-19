import {GraphQLError} from 'graphql';
import catModel from '../models/catModel';
import {
  Cat,
  LocationInput,
  TokenContent,
  coordinates,
} from '../../types/DBTypes';
import mongoose from 'mongoose';
import {Point} from 'geojson';
import {MyContext} from '../../types/MyContext';

// TODO: create resolvers based on cat.graphql
// note: when updating or deleting a cat, you need to check if the user is the owner of the cat
// note2: when updating or deleting a cat as admin, you need to check if the user is an admin by checking the role from the user object
// note3: updating and deleting resolvers should be the same for users and admins. Use if statements to check if the user is the owner or an admin
export default {
  Query: {
    cats: async () => {
      return await catModel.find();
    },
    catById: async (_parent: undefined, args: {id: string}) => {
      const cat = await catModel.findById(args.id);
      if (!cat) {
        throw new GraphQLError('Cat not found', {
          extensions: {code: 'NOT_FOUND'},
        });
      }
      return cat;
    },
    catsByOwner: async (_parent: undefined, args: {ownerId: string}) => {
      const cats = await catModel.find({owner: args.ownerId});
      if (cats.length === 0) {
        throw new GraphQLError('Cat not found', {
          extensions: {code: 'NOT_FOUND'},
        });
      }
      return cats;
    },
    catsByArea: async (
      _parent: undefined,
      args: {topRight: coordinates; bottomLeft: coordinates},
    ) => {
      const rightCorner = [args.topRight.lat, args.topRight.lng];
      const leftCorner = [args.bottomLeft.lat, args.bottomLeft.lng];

      const cats = await catModel.find({
        location: {
          $geoWithin: {
            $box: [leftCorner, rightCorner],
          },
        },
      });
      if (cats.length === 0) {
        throw new GraphQLError('Cat not found', {
          extensions: {code: 'NOT_FOUND'},
        });
      }
      return cats;
    },
  },
  Mutation: {
    createCat: async (
      _parent: undefined,
      args: {
        cat_name: String;
        weight: Number;
        birthdate: Date;
        owner: mongoose.Schema.Types.ObjectId;
        location: Point;
        filename: String;
      },
      context: MyContext,
    ): Promise<Cat> => {
      if (!context.userdata) {
        throw new GraphQLError('User not authenticated', {
          extensions: {code: 'UNAUTHENTICATED'},
        });
      }
      const newCat = await catModel.create({
        cat_name: args.cat_name,
        weight: args.weight,
        birthdate: args.birthdate,
        owner: args.owner,
        location: args.location,
        filename: args.filename,
      });
      if (!newCat) {
        throw new Error('Error creating cat');
      }
      return newCat;
    },
    updateCat: async (
      _parent: undefined,
      args: {
        id: string;
        cat_name?: String;
        weight?: Number;
        birthdate?: Date;
        owner?: mongoose.Schema.Types.ObjectId;
        location?: Point;
        filename: String;
      },
      context: MyContext,
    ): Promise<Cat> => {
      if (!context.userdata) {
        throw new GraphQLError('User not authenticated', {
          extensions: {code: 'UNAUTHENTICATED'},
        });
      }
      const updatedCat = await catModel.findByIdAndUpdate(
        args.id,
        {
          cat_name: args.cat_name,
          weight: args.weight,
          birthdate: args.birthdate,
          owner: args.owner,
          location: args.location,
          filename: args.filename,
        },
        {
          new: true,
        },
      );
      if (!updatedCat) {
        throw new Error('Cat not found');
      }
      return updatedCat;
    },
    deleteCat: async (
      _parent: undefined,
      args: {id: string},
      context: MyContext,
    ): Promise<Cat> => {
      if (!context.userdata) {
        throw new GraphQLError('User not authenticated', {
          extensions: {code: 'UNAUTHENTICATED'},
        });
      }
      const deletedCat = await catModel.findByIdAndDelete(args.id);
      if (!deletedCat) {
        throw new Error('Cat not found');
      }
      return deletedCat;
    },
  },
};
