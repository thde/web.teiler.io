import {Transaction} from './transaction';
import {Person} from './person';
import {Profiteer} from './profiteer';
import {del} from 'selenium-webdriver/http';

export class Expense extends Transaction {
  public static fromDto(dto: any): Expense {
    return new Expense(
      parseInt(dto.id, 10),
      Person.fromDto(dto.payer),
      parseInt(dto.amount, 10),
      dto.title,
      dto.profiteers.map((profiteer: any) => Profiteer.fromDto(profiteer)),
      new Date(dto['create-time']),
      new Date(dto['update-time'])
    );
  }

  constructor(id: number,
              payer: Person,
              amount: number,
              public title: string,
              public profiteers: Profiteer[],
              createdTime?: Date,
              modifiedTime?: Date) {
    super(id, payer, amount, createdTime, modifiedTime);
  }

  public split() {
    const totalActive = this.getTotalActiveProfiteers();

    if (totalActive > 0) {
      const sharedValue = this.amount / totalActive;
      const percentageValue = 100 / totalActive;
      this.profiteers.forEach((profiteer: Profiteer) => {
        if (profiteer.isInvolved) {
          profiteer.updateShare(sharedValue);
          profiteer.setPercentage(percentageValue);
        }
      });

      if (!this.checkSumOfSharedAmount()) {
        this.adjustSharedAmount();
      }
    }
  }

  private adjustSharedAmount() {
    const delta = this.amount - this.getSumOfSharedAmount();
    const firstProfiteer = this.getFirstActiveProfiteer();
    firstProfiteer.updateShare(firstProfiteer.share + delta);
    firstProfiteer.setPercentage(firstProfiteer.share / this.amount * 100);
  }

  private getFirstActiveProfiteer(): Profiteer {
    for (let i = 0; i < this.profiteers.length; i++) {
      if (this.profiteers[i].isInvolved) {
        return this.profiteers[i];
      }
    }
    return null;
  }

  public getTotalActiveProfiteers(): number {
    return this.profiteers.reduce((total: number, profiteer: Profiteer) => {
      return profiteer.isInvolved ? total + 1 : total;
    }, 0);
  }

  public checkSumOfSharedAmount(): boolean {
    return this.getSumOfSharedAmount() === this.amount;
  }

  public updatePercentage() {
    this.profiteers.forEach((profiteer: Profiteer) => {
      if (this.amount) {
        profiteer.setPercentage(profiteer.share / this.amount * 100);
      } else {
        profiteer.setPercentage(0);
      }
    });
  }

  private getSumOfSharedAmount(): number {
    let sum = 0;
    this.profiteers.forEach((profiteer: Profiteer) => {
      sum += profiteer.share;
    });
    return sum;
  }

  public isValid(): boolean {
    return this.title
      && this.payer
      && this.amount > 0
      && this.getTotalActiveProfiteers() > 0
      && this.checkSumOfSharedAmount();
  }
}
