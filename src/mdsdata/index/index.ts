import { Injectable } from '@nestjs/common';
// import { IdxService } from './mdsdata/services/Unused/mdsdata.service';
import { MdsdataService } from '../services/mdsdata.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class IndexProvider {
  // constructor(private readonly idxService: IdxService) {}
  constructor(private readonly mdsdataService: MdsdataService) {}
  //Start the browser and create a browser instance
  @Cron('*/5 9-16 * * 0-4', {
    // @Cron('*/2 9-18 * * *', {
    timeZone: 'Asia/Dhaka', // Set the desired timezone here
  }) // Starts everyday at 9.30 am from sunday to thursday and repeats after every 5 minutes.
  async func() {
    console.log('Cron Started in mdsdata');

    const response = await this.mdsdataService.readAll();
  }
}
