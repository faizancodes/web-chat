const reducer = (state: Message[], action: { type: 'add', message: Message }) => {
  switch (action.type) {
    case 'add':
      return [...state, action.message];
    default:
      return state;
  }
};

const [messages, dispatch] = useReducer(reducer, initialMessages);

dispatch({ type: 'add', message: userMessage });