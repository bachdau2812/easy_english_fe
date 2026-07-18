import { WordExampleResponse } from "../types";

export const WordExampleList = ({ examples }: { examples?: WordExampleResponse[] | null }) => {
  if (!examples?.length) {
    return null;
  }

  return (
    <ul>
      {examples.map((example, index) => (
        <li key={example.wordExampleId ?? index}>
          <span>{example.sentence}</span>
          {example.trans ? <small> {example.trans}</small> : null}
        </li>
      ))}
    </ul>
  );
};
