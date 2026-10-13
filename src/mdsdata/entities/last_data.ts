import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LastDataDocument = lastData & Document;

@Schema({ collection: 'lastdatas' })
export class lastData {
  @Prop({ type: String })
  companiesLastData: string;

  @Prop({ type: String })
  circuit_breaksLastData: string;

  @Prop({ type: String })
  IDXLastData: string;

  @Prop({ type: String })
  MANLastData: string;

  @Prop({ type: String })
  MKISTATLastData: string;

  @Prop({ type: String })
  TRDLastData: string;

  @Prop({ type: String })
  price_earningsLastData: string;
}
export const LastDataSchema = SchemaFactory.createForClass(lastData);
