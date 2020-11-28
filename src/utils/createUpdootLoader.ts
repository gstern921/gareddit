import DataLoader from "dataloader";
import { Updoot } from "../entities/Updoot";
export const createUpdootLoader = () =>
  new DataLoader<{ postId: number; userId: number }, Updoot | null>(
    async (keys) => {
      const updoots = await Updoot.findByIds(keys as any);
      const updootIdsToUpdoot: Record<string, Updoot> = {};
      updoots.forEach((updoot) => {
        const id: string = `${updoot.userId}|${updoot.postId}`;
        updootIdsToUpdoot[id] = updoot;
      });
      return keys.map((key) => {
        const id: string = `${key.userId}|${key.postId}`;
        return updootIdsToUpdoot[id] || null;
      });
    }
  );
