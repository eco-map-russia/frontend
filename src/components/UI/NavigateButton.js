function NavigateButton(props) {
  return (
    <button className="navigate-button">
      <img src={props.icon} alt="Zoom" />
    </button>
  );
}

export default NavigateButton;
