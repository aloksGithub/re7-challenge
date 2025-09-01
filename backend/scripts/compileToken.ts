import solc from 'solc';

export type CompiledToken = { abi: any[]; bytecode: string };

export async function compileToken(name: string, symbol: string): Promise<CompiledToken> {
  const source = `
  contract TestToken {
    string public name = "${name}";
    string public symbol = "${symbol}";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor() {}

    function mint(address to, uint256 amount) public {
      balanceOf[to] += amount;
      totalSupply += amount;
      emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) public returns (bool) {
      require(balanceOf[msg.sender] >= amount, "insufficient");
      balanceOf[msg.sender] -= amount;
      balanceOf[to] += amount;
      emit Transfer(msg.sender, to, amount);
      return true;
    }
  }`;

  const input = {
    language: 'Solidity',
    sources: { 'Token.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
    },
  } as const;

  const compiled = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (compiled.errors || []).filter((e: any) => e.severity === 'error');
  if (errors.length) {
    throw new Error(
      'Solc compile failed: ' + errors.map((e: any) => e.formattedMessage || e.message).join('\n'),
    );
  }
  const artifact = compiled.contracts['Token.sol']['TestToken'];
  const abi = artifact.abi as any[];
  const bytecode = '0x' + artifact.evm.bytecode.object;
  return { abi, bytecode };
}
