export class AppStateMachine {
  /**
   * @param {string} initialState 
   * @param {Object} transitions 
   */
  constructor(initialState, transitions) {
    if (!transitions[initialState]) {
      throw new Error(`Invalid initial state: ${initialState}`);
    }
    this.currentState = initialState;
    this.transitions = transitions;
  }

  /**
   * Attempt to transition to a new state
   * @param {string} newState - The state to transition to
   * @returns {boolean} true if successful, throws error otherwise
   */
  transition(newState) {
    const validNextStates = this.transitions[this.currentState];

    if (!validNextStates) {
      throw new Error(`Current state '${this.currentState}' has no valid transitions defined.`);
    }

    if (!validNextStates.includes(newState)) {
      throw new Error(`Invalid transition: Cannot move from '${this.currentState}' to '${newState}'. Valid next states: ${validNextStates.join(', ')}`);
    }

    this.currentState = newState;
    return true;
  }

  getCurrentState() {
    return this.currentState;
  }

  canTransition(newState) {
    const validNextStates = this.transitions[this.currentState] || [];
    return validNextStates.includes(newState);
  }
}
