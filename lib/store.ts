import "server-only";
import { hasDatabase } from "./db";
import * as mock from "./store-mock";
import * as pg from "./store-pg";

/**
 * 데이터 계층 입구. 화면과 액션은 전부 여기만 본다.
 *
 * DATABASE_URL이 있으면 Postgres(store-pg), 없으면 목업(store-mock).
 * 두 구현은 같은 함수·같은 반환 모양을 지킨다 — 타입은 store-types 한 곳에 있다.
 */

export * from "./store-types";

/** 지금 목업으로 돌고 있는가(= 서버가 새로 뜨면 데이터가 사라지는가). */
export const isMock = !hasDatabase();

// 모듈을 읽는 시점이 아니라 부르는 시점에 고른다 — 테스트에서 드라이버를 갈아끼울 수 있게.
const impl = () => (hasDatabase() ? pg : mock);

export const authenticate: typeof mock.authenticate = (...a) => impl().authenticate(...a);
export const getUser: typeof mock.getUser = (...a) => impl().getUser(...a);
export const listUsers: typeof mock.listUsers = (...a) => impl().listUsers(...a);
export const setPen: typeof mock.setPen = (...a) => impl().setPen(...a);
export const getInviteCode: typeof mock.getInviteCode = (...a) => impl().getInviteCode(...a);
export const setInviteCode: typeof mock.setInviteCode = (...a) => impl().setInviteCode(...a);
export const findUserByCode: typeof mock.findUserByCode = (...a) => impl().findUserByCode(...a);
export const listConnectionsFor: typeof mock.listConnectionsFor = (...a) => impl().listConnectionsFor(...a);
export const getConnection: typeof mock.getConnection = (...a) => impl().getConnection(...a);
export const activeConnection: typeof mock.activeConnection = (...a) => impl().activeConnection(...a);
export const requestConnection: typeof mock.requestConnection = (...a) => impl().requestConnection(...a);
export const acceptConnection: typeof mock.acceptConnection = (...a) => impl().acceptConnection(...a);
export const removeConnection: typeof mock.removeConnection = (...a) => impl().removeConnection(...a);
export const setMetOn: typeof mock.setMetOn = (...a) => impl().setMetOn(...a);
export const listEntries: typeof mock.listEntries = (...a) => impl().listEntries(...a);
export const listEntriesInMonth: typeof mock.listEntriesInMonth = (...a) => impl().listEntriesInMonth(...a);
export const insertEntry: typeof mock.insertEntry = (...a) => impl().insertEntry(...a);
export const updateEntry: typeof mock.updateEntry = (...a) => impl().updateEntry(...a);
export const deleteEntry: typeof mock.deleteEntry = (...a) => impl().deleteEntry(...a);
export const listMilestones: typeof mock.listMilestones = (...a) => impl().listMilestones(...a);
export const insertMilestone: typeof mock.insertMilestone = (...a) => impl().insertMilestone(...a);
export const deleteMilestone: typeof mock.deleteMilestone = (...a) => impl().deleteMilestone(...a);
export const listBuckets: typeof mock.listBuckets = (...a) => impl().listBuckets(...a);
export const insertBucket: typeof mock.insertBucket = (...a) => impl().insertBucket(...a);
export const setBucketPhoto: typeof mock.setBucketPhoto = (...a) => impl().setBucketPhoto(...a);
export const setBucketDone: typeof mock.setBucketDone = (...a) => impl().setBucketDone(...a);
export const deleteBucket: typeof mock.deleteBucket = (...a) => impl().deleteBucket(...a);
export const restoreBucket: typeof mock.restoreBucket = (...a) => impl().restoreBucket(...a);
export const listAnswers: typeof mock.listAnswers = (...a) => impl().listAnswers(...a);
export const listAnsweredDays: typeof mock.listAnsweredDays = (...a) => impl().listAnsweredDays(...a);
export const upsertAnswer: typeof mock.upsertAnswer = (...a) => impl().upsertAnswer(...a);
export const listPlaces: typeof mock.listPlaces = (...a) => impl().listPlaces(...a);
export const insertPlace: typeof mock.insertPlace = (...a) => impl().insertPlace(...a);
export const deletePlace: typeof mock.deletePlace = (...a) => impl().deletePlace(...a);
export const listWishes: typeof mock.listWishes = (...a) => impl().listWishes(...a);
export const insertWish: typeof mock.insertWish = (...a) => impl().insertWish(...a);
export const deleteWish: typeof mock.deleteWish = (...a) => impl().deleteWish(...a);
export const notifyPartner: typeof mock.notifyPartner = (...a) => impl().notifyPartner(...a);
export const listNotices: typeof mock.listNotices = (...a) => impl().listNotices(...a);
export const countUnread: typeof mock.countUnread = (...a) => impl().countUnread(...a);
export const markAllRead: typeof mock.markAllRead = (...a) => impl().markAllRead(...a);
export const getSajuProfile: typeof mock.getSajuProfile = (...a) => impl().getSajuProfile(...a);
export const upsertSajuProfile: typeof mock.upsertSajuProfile = (...a) => impl().upsertSajuProfile(...a);
export const listSajuProfiles: typeof mock.listSajuProfiles = (...a) => impl().listSajuProfiles(...a);
export const listSajuThreads: typeof mock.listSajuThreads = (...a) => impl().listSajuThreads(...a);
export const listAllSajuThreads: typeof mock.listAllSajuThreads = (...a) => impl().listAllSajuThreads(...a);
export const getSajuThread: typeof mock.getSajuThread = (...a) => impl().getSajuThread(...a);
export const findSajuThread: typeof mock.findSajuThread = (...a) => impl().findSajuThread(...a);
export const createSajuThread: typeof mock.createSajuThread = (...a) => impl().createSajuThread(...a);
export const appendSajuTurn: typeof mock.appendSajuTurn = (...a) => impl().appendSajuTurn(...a);
export const scoreSajuTurn: typeof mock.scoreSajuTurn = (...a) => impl().scoreSajuTurn(...a);
export const deleteSajuThread: typeof mock.deleteSajuThread = (...a) => impl().deleteSajuThread(...a);
