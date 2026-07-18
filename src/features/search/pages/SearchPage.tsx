import { SearchBox } from "../components/SearchBox";

export const SearchPage = () => (
  <section className="page">
    <div className="page__header">
      <h1 className="page__title">Dictionary search</h1>
      <p className="page__description">
        Uses `/word-data/words/basic-search` with 250ms debounce and request cancellation.
      </p>
    </div>
    <div className="panel">
      <SearchBox />
    </div>
  </section>
);
