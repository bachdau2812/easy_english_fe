import { ISODateString, UUID } from "../../shared/types/common";

export interface Word {
  id?: UUID | null;
  word?: string | null;
  normalizedWord?: string | null;
  pos?: string | null;
  lang?: string | null;
  langCode?: string | null;
  wordSource?: string | null;
  otherSource?: string | null;
  certLevel?: string | null;
  createdAt?: ISODateString | null;
  updatedAt?: ISODateString | null;
}

export interface Category {
  id?: UUID | null;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  createdAt?: ISODateString | null;
}

export interface WordResponse {
  wordId?: UUID | null;
  word?: string | null;
  normalizedWord?: string | null;
  pos?: string | null;
  certLevel?: string | null;
  lang?: string | null;
  langCode?: string | null;
  wordSource?: string | null;
  otherSource?: string | null;
  categories?: string[] | null;
  sounds?: WordSoundResponse[] | null;
  senses?: WordSenseResponse[] | null;
  idioms?: WordIdiomResponse[] | null;
  forms?: WordFormResponse[] | null;
  relation?: WordRelationResponse | null;
}

export interface WordSenseResponse {
  senseId?: UUID | null;
  localizationId?: UUID | null;
  wordId?: UUID | null;
  word?: string | null;
  pos?: string | null;
  certLevel?: string | null;
  shortMeaning?: string | null;
  definition?: string | null;
  synonyms?: string[] | null;
  antonyms?: string[] | null;
  examples?: WordExampleResponse[] | null;
  trans?: WordSenseTranslation | null;
  derived?: string[] | null;
  coordinateTerms?: string[] | null;
  formOf?: string[] | null;
  altOf?: string[] | null;
}

export interface WordSenseTranslation {
  langCode?: string | null;
  shortMeaning?: string | null;
  definition?: string | null;
}

export interface WordExampleResponse {
  wordExampleId?: UUID | null;
  senseId?: UUID | null;
  wordSenseLocalizationId?: UUID | null;
  wordId?: UUID | null;
  word?: string | null;
  pos?: string | null;
  certLevel?: string | null;
  sentence?: string | null;
  trans?: string | null;
}

export interface WordSoundResponse {
  wordId?: UUID | null;
  ipa?: string | null;
  tags?: string[] | null;
  soundSource?: string | null;
  oggUrl?: string | null;
  mp3Url?: string | null;
  enpr?: string | null;
}

export interface WordFormResponse {
  wordId?: UUID | null;
  word?: string | null;
  pos?: string | null;
  certLevel?: string | null;
  form?: string | null;
  tags?: string[] | null;
}

export interface WordRelationResponse {
  wordId?: UUID | null;
  word?: string | null;
  pos?: string | null;
  certLevel?: string | null;
  synonyms?: string[] | null;
  antonyms?: string[] | null;
  derived?: string[] | null;
  coordinateTerms?: string[] | null;
  formOf?: string[] | null;
  altOf?: string[] | null;
}

export interface WordIdiomResponse {
  wordId?: UUID | null;
  word?: string | null;
  pos?: string | null;
  certLevel?: string | null;
  idiom?: string | null;
  definition?: string | null;
  example?: string | null;
  example2?: string | null;
  trans?: WordIdiomTranslation | null;
}

export interface WordIdiomTranslation {
  idiom?: string | null;
  definition?: string | null;
  example?: string | null;
  example2?: string | null;
}
