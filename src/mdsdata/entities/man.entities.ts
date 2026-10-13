// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document, Types } from 'mongoose';
// // import {
// //   Entity,
// //   Column,
// //   // PrimaryGeneratedColumn,
// //   PrimaryColumn,
// //   // BeforeInsert,
// //   // CreateDateColumn,
// // } from 'typeorm';

// export type ManDocument = man & Document;

// // @Entity()
// @Schema({ collection: 'man_mds' })
// export class man {
//   // @Column()
//   @Prop({ type: String })
//   MAN_ANNOUNCEMENT_DATE_TIME: string;

//   // @Column()
//   @Prop({ type: String })
//   MAN_ANNOUNCEMENT_PREFIX: string;

//   // @Column()
//   @Prop({ type: String })
//   MAN_ANNOUNCEMENT: string;

//   // @PrimaryColumn()
//   @Prop({ type: String })
//   MAN_EXPIRY_DATE: string; /*Need to use type Date.......Custom date fromate needed */
// }

// export const ManSchema = SchemaFactory.createForClass(man);

// ManSchema.index(
//   { MAN_ANNOUNCEMENT_DATE_TIME: 1, MAN_ANNOUNCEMENT: 1 },
//   { unique: true },
// );
// // export default mongoose.models.man_md || mongoose.model('man_md', manSchema);
// // // module.exports= mongoose.model('trd', trdSchema);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document, Schema as MongooseSchema } from 'mongoose';

export type ManDocument = man & Document;

@Schema({ collection: 'man_mds', timestamps: true })
export class man {
  @Prop({ type: Date })
  MAN_ANNOUNCEMENT_DATE_TIME: Date;

  @Prop({ type: MongooseSchema.Types.Mixed })
  MAN_ANNOUNCEMENT_DATE_TIME_SOURCE: Date | string;

  @Prop({ type: String })
  MAN_ANNOUNCEMENT_PREFIX: string;

  @Prop({ type: String })
  MAN_ANNOUNCEMENT: string;

  @Prop({ type: String })
  MAN_EXPIRY_DATE: string;
}

export const ManSchema = SchemaFactory.createForClass(man);

ManSchema.index(
  {
    MAN_ANNOUNCEMENT_DATE_TIME: 1,
    MAN_ANNOUNCEMENT: 1,
  },
  {
    unique: true,
  },
);
